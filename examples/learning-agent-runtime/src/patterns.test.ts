import assert from "node:assert/strict";
import test from "node:test";
import { AgentKernel, type AgentKernelOptions } from "./agent.js";
import { RuntimeHooks } from "./hooks.js";
import { ScriptedModel } from "./model.js";
import { InMemoryScheduler } from "./scheduler.js";
import { collectResources, runStudyWorkflow, verifyStudyPlan } from "./study-workflow.js";
import { InMemoryTraceStore } from "./trace.js";
import { BasicPolicyEngine, ToolExecutor, ToolRegistry } from "./tools.js";
import type { ModelDecision, ModelProvider } from "./types.js";

const goal = { topics: ["fractions"], minutes: 30 };
const resources = [{ id: "r1", topic: "fractions" }];
const plan = (minutes: number) => JSON.stringify({
  sessions: [{ topic: "fractions", minutes, resourceId: "r1" }],
});
const request = () => ({
  threadId: "thread", userId: "student", allowedTools: new Set<string>(),
  observation: { id: "input", modality: "text" as const, source: "test",
    content: "plan", occurredAt: new Date().toISOString() },
});

function fixture(decisions: ModelDecision[], options: Partial<AgentKernelOptions> = {}, configure?: (hooks: RuntimeHooks) => void) {
  const registry = new ToolRegistry();
  const traces = new InMemoryTraceStore();
  const model = new ScriptedModel(decisions);
  const hooks = new RuntimeHooks(traces);
  configure?.(hooks);
  let executions = 0;
  registry.register({
    name: "count", version: "1", description: "Count an execution",
    inputSchema: { type: "object" }, sideEffect: "none",
    validate: (args) => args,
    async execute() { executions += 1; return { ok: true, content: executions }; },
  });
  const kernel = new AgentKernel(model, registry,
    new ToolExecutor(registry, new BasicPolicyEngine(), traces), traces,
    { maxSteps: 3, systemInstruction: "test", hooks, ...options });
  return { kernel, model, registry, traces, executions: () => executions };
}

function acceptPlan(hooks: RuntimeHooks): void {
  hooks.addGuard("BeforeFinish", {
    id: "goal.verify",
    handle: ({ answer }) => {
      const result = verifyStudyPlan(answer, goal, resources);
      return result.passed ? { effect: "continue" } : { effect: "block", reason: result.feedback };
    },
  });
}

test("acceptance failure reaches the model and a corrected answer completes", async () => {
  const f = fixture([{ type: "answer", content: plan(60) }, { type: "answer", content: plan(20) }],
    {}, acceptPlan);
  const outcome = await f.kernel.run(request());
  assert.equal(outcome.status, "completed");
  assert.ok(f.model.requests[1]?.messages.some((m) => m.content.includes("total minutes: 60")));
  assert.deepEqual(f.traces.list(outcome.traceId).filter((e) => e.name === "goal.verify" && e.status !== "started")
    .map((e) => e.status), ["error", "ok"]);
});

test("repeated invalid answers stop at the step budget", async () => {
  const f = fixture(Array.from({ length: 2 }, () => ({ type: "answer", content: plan(60) })),
    { maxSteps: 2 }, acceptPlan);
  assert.equal((await f.kernel.run(request())).status, "failed");
  assert.equal(f.model.requests.length, 2);
});

test("verification exceptions fail the run rather than accepting an unchecked answer", async () => {
  const f = fixture([{ type: "answer", content: "candidate" }],
    {}, (hooks) => hooks.addGuard("BeforeFinish", {
      id: "broken-check", handle: () => { throw new Error("validator unavailable"); },
    }));
  const outcome = await f.kernel.run(request());
  assert.equal(outcome.status, "failed");
  if (outcome.status === "failed") assert.match(outcome.error, /validator unavailable/);
});

test("plan validation rejects missing coverage and mismatched resource provenance", () => {
  assert.equal(verifyStudyPlan(plan(20), { topics: ["fractions", "algebra"], minutes: 30 }, resources).passed, false);
  assert.equal(verifyStudyPlan(plan(20), goal, [{ id: "r1", topic: "algebra" }]).passed, false);
  assert.equal(verifyStudyPlan('{"sessions":[]}', goal, resources).passed, false);
  assert.equal(verifyStudyPlan(plan(-1), goal, resources).passed, false);
  assert.equal(verifyStudyPlan("not JSON", goal, resources).passed, false);
});

test("tool budget stops extra calls inside a single model batch", async () => {
  const f = fixture([{ type: "tool_calls", calls: [1, 2, 3].map((id) => ({
    id: String(id), name: "count", arguments: {},
  })) }], { maxToolCalls: 2 });
  const outcome = await f.kernel.run({ ...request(), allowedTools: new Set(["count"]) });
  assert.equal(outcome.status, "failed");
  assert.equal(f.executions(), 2);
  assert.equal(f.model.requests.length, 1);
});

test("rejected proposals also consume the tool-attempt budget", async () => {
  const f = fixture([{ type: "tool_calls", calls: [
    { id: "denied", name: "unknown", arguments: {} },
    { id: "allowed", name: "count", arguments: {} },
  ] }], { maxToolCalls: 1 });
  assert.equal((await f.kernel.run({ ...request(), allowedTools: new Set(["count"]) })).status, "failed");
  assert.equal(f.executions(), 0);
});

test("invalid budget configuration is rejected", () => {
  assert.throws(() => fixture([], { maxSteps: 0 }), /maxSteps/);
  assert.throws(() => fixture([], { maxToolCalls: -1 }), /maxToolCalls/);
});

test("cancellation during a model request cannot become a completed answer", async () => {
  const controller = new AbortController();
  const model: ModelProvider = { async decide() {
    controller.abort();
    return { type: "answer", content: "late answer" };
  } };
  const registry = new ToolRegistry();
  const traces = new InMemoryTraceStore();
  const kernel = new AgentKernel(model, registry,
    new ToolExecutor(registry, new BasicPolicyEngine(), traces), traces);
  assert.equal((await kernel.run({ ...request(), signal: controller.signal })).status, "cancelled");
});

test("independent reads start together and retain partial failure", async () => {
  const started: string[] = [];
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const pending = collectResources(["fractions", "algebra"], async (topic) => {
    started.push(topic);
    await gate;
    if (topic === "algebra") throw new Error("unavailable");
    return { id: "r1", topic };
  });
  assert.deepEqual(started, ["fractions", "algebra"]);
  release();
  assert.deepEqual(await pending, { resources, missing: ["algebra"] });
});

test("missing evidence or required resources never reaches the planning model", async () => {
  const model = new ScriptedModel([]);
  const input = {
    minutes: 30, model, traces: new InMemoryTraceStore(),
    lookup: async (): Promise<{ id: string; topic: string }> => { throw new Error("offline"); },
  };
  assert.equal((await runStudyWorkflow({ ...input, evidence: [] })).status, "needs_input");
  assert.equal((await runStudyWorkflow({ ...input,
    evidence: [{ topic: "fractions", needsPractice: true }] })).status, "missing_resources");
  assert.equal(model.requests.length, 0);
});

test("priority applies only to ready jobs and does not preempt an active lease", () => {
  const s = new InMemoryScheduler();
  const now = new Date("2026-01-01T00:00:00Z");
  s.scheduleOnce("t", "normal", now, 0);
  s.scheduleOnce("t", "urgent", now, 10);
  s.scheduleOnce("t", "future", new Date(now.getTime() + 10_000), 100);
  s.tick(now);
  const urgent = s.claim("w1", now, 1000);
  assert.equal(urgent?.taskName, "urgent");
  assert.equal(s.claim("w2", now, 1000)?.taskName, "normal");
  assert.equal(s.claim("w3", now, 1000), undefined);
  assert.equal(s.claim("w3", new Date(now.getTime() + 1001), 1000)?.id, urgent?.id);
  assert.throws(() => s.registerEvent("t", "bad", "event", NaN), /finite/);
});

test("event jobs inherit priority and still deduplicate", () => {
  const s = new InMemoryScheduler();
  const now = new Date("2026-01-01T00:00:00Z");
  s.registerEvent("t", "review", "quiz.completed", 7);
  assert.equal(s.emitEvent("event-1", "quiz.completed", now)[0]?.priority, 7);
  assert.equal(s.emitEvent("event-1", "quiz.completed", now).length, 0);
});

test("external side effects require approval before execution", async () => {
  let sent = false;
  const f = fixture([{ type: "tool_calls", calls: [
    { id: "send-1", name: "send_reminder", arguments: {} },
  ] }]);
  f.registry.register({
    name: "send_reminder", version: "1", description: "Send a reminder",
    sideEffect: "external", inputSchema: { type: "object" },
    validate: (args) => args,
    async execute() { sent = true; return { ok: true, content: "sent" }; },
  });
  const outcome = await f.kernel.run({ ...request(), allowedTools: new Set(["send_reminder"]) });
  assert.equal(outcome.status, "waiting");
  if (outcome.status === "waiting") assert.equal(outcome.reason, "approval");
  assert.equal(sent, false);
});
