import assert from "node:assert/strict";
import test from "node:test";
import { AgentKernel } from "./agent.js";
import { RuntimeHooks, type HookDecision } from "./hooks.js";
import { ScriptedModel } from "./model.js";
import { InMemoryTraceStore } from "./trace.js";
import { BasicPolicyEngine, ToolExecutor, ToolRegistry } from "./tools.js";
import type { ModelDecision, ToolResult } from "./types.js";

const call = () => ({ id: "call-1", name: "read", arguments: { topic: "fractions" } });
const proposal = (): ModelDecision => ({ type: "tool_calls", calls: [call()] });
const answer: ModelDecision = { type: "answer", content: "finished" };
const request = () => ({
  threadId: "thread", userId: "student", allowedTools: new Set(["read"]),
  observation: { id: "input", modality: "text" as const, source: "test",
    content: "learn", occurredAt: new Date().toISOString() },
});

function fixture(decisions: ModelDecision[] = [proposal(), answer], config: {
  denied?: boolean; write?: boolean; invalid?: boolean; toolThrows?: boolean;
} = {}) {
  const traces = new InMemoryTraceStore();
  const hooks = new RuntimeHooks(traces);
  const registry = new ToolRegistry();
  const model = new ScriptedModel([...decisions]);
  const executed: unknown[] = [];
  registry.register({
    name: "read", version: "1", description: "Read a mock resource",
    inputSchema: { type: "object" }, sideEffect: config.write ? "write" : "read",
    validate: (args) => { if (config.invalid) throw new Error("Invalid input"); return args; },
    async execute(args) {
      executed.push(args);
      if (config.toolThrows) throw new Error("Storage unavailable");
      return { ok: true, content: { text: "original" } };
    },
  });
  const executor = new ToolExecutor(registry,
    new BasicPolicyEngine(new Set(config.denied ? ["read"] : [])), traces);
  const kernel = new AgentKernel(model, registry, executor, traces,
    { maxSteps: 3, systemInstruction: "test", hooks });
  return { traces, hooks, model, executed, kernel };
}

test("lifecycle hooks run in order and RunEnd observes the final result once", async () => {
  const f = fixture();
  const events: string[] = [];
  let observedResult: boolean | undefined;
  let observedExecutions = 0;
  let observedEnding: string | undefined;
  f.hooks.addObserver("RunStart", { id: "start", handle: () => { events.push("start"); } });
  f.hooks.addGuard("BeforeToolCall", { id: "before", handle: () => {
    events.push("before"); assert.equal(f.executed.length, 0); return { effect: "continue" };
  } });
  f.hooks.addObserver("AfterToolCall", { id: "after", handle: ({ result }) => {
    events.push("after"); observedResult = result.ok; observedExecutions = f.executed.length;
  } });
  f.hooks.addGuard("BeforeFinish", { id: "finish", handle: () => {
    events.push("finish"); return { effect: "continue" };
  } });
  f.hooks.addObserver("RunEnd", { id: "end", handle: ({ outcome }) => {
    events.push("end"); observedEnding = outcome.status;
  } });
  const outcome = await f.kernel.run(request());
  assert.deepEqual(events, ["start", "before", "after", "finish", "end"]);
  assert.equal(outcome.status, "completed");
  assert.equal(observedResult, true);
  assert.equal(observedExecutions, 1);
  assert.equal(observedEnding, "completed");
  const entries = f.traces.list(outcome.traceId);
  assert.equal(entries.filter((e) => e.type === "hook" && e.status === "started").length, 5);
  assert.equal(entries.filter((e) => e.name === "agent.run" && e.status !== "started").length, 1);
});

test("a tool guard blocks before execution and stops later guards for that call", async () => {
  const f = fixture();
  let later = 0;
  let after = 0;
  f.hooks.addGuard("BeforeToolCall", { id: "block", handle: () => ({ effect: "block", reason: "Unsupported topic" }) });
  f.hooks.addGuard("BeforeToolCall", { id: "later", handle: () => {
    later += 1; return { effect: "continue" };
  } });
  f.hooks.addObserver("AfterToolCall", { id: "after", handle: () => { after += 1; } });
  assert.equal((await f.kernel.run(request())).status, "completed");
  assert.equal(f.executed.length, 0);
  assert.equal(later, 0);
  assert.equal(after, 0);
  assert.ok(f.model.requests[1]?.messages.some((m) => m.content.includes("HOOK_BLOCKED")));
});

for (const [name, config, allowed, code] of [
  ["visibility", {}, false, "TOOL_NOT_ALLOWED"],
  ["schema", { invalid: true }, true, "VALIDATION_ERROR"],
  ["policy", { denied: true }, true, "PERMISSION_DENIED"],
  ["approval", { write: true }, true, "APPROVAL_REQUIRED"],
] as const) {
  test("hooks cannot bypass " + name, async () => {
    const f = fixture(undefined, config);
    let checks = 0;
    f.hooks.addGuard("BeforeToolCall", { id: "continue", handle: () => {
      checks += 1; return { effect: "continue" };
    } });
    const outcome = await f.kernel.run({ ...request(), allowedTools: new Set(allowed ? ["read"] : []) });
    assert.equal(f.executed.length, 0);
    assert.equal(checks, 0);
    if (code === "APPROVAL_REQUIRED") {
      assert.equal(outcome.status, "waiting");
    } else {
      assert.ok(f.model.requests[1]?.messages.some((m) => m.content.includes(code)));
    }
  });
}

test("AfterToolCall sees normalized execution failures", async () => {
  const f = fixture(undefined, { toolThrows: true });
  let observed: string | undefined;
  f.hooks.addObserver("AfterToolCall", { id: "after", handle: ({ result }) => { observed = result.error?.code; } });
  await f.kernel.run(request());
  assert.equal(observed, "TOOL_EXECUTION_FAILED");
});

test("observer exceptions and deadlines are traced without changing the result", { timeout: 2000 }, async () => {
  const f = fixture([answer]);
  f.hooks.addObserver("RunStart", { id: "slow-metric", timeoutMs: 10, handle: () => new Promise(() => {}) });
  f.hooks.addObserver("RunEnd", { id: "broken-log", handle: () => { throw new Error("logging down"); } });
  const outcome = await f.kernel.run(request());
  assert.equal(outcome.status, "completed");
  assert.deepEqual(f.traces.list(outcome.traceId).filter((e) => e.type === "hook" && e.status !== "started")
    .map((e) => e.status), ["error", "error"]);
});

for (const kind of ["exception", "invalid-result"] as const) {
  test("a control hook " + kind + " fails closed", async () => {
    const f = fixture();
    f.hooks.addGuard("BeforeToolCall", { id: "bad-guard", handle: () => {
      if (kind === "exception") throw new Error("checker offline");
      return undefined as unknown as HookDecision;
    } });
    assert.equal((await f.kernel.run(request())).status, "failed");
    assert.equal(f.executed.length, 0);
    assert.equal(f.model.requests.length, 1);
  });
}

test("a timed-out guard cannot execute a tool when its late result arrives", { timeout: 2000 }, async () => {
  const f = fixture();
  let release!: (result: HookDecision) => void;
  let hookSignal: AbortSignal | undefined;
  f.hooks.addGuard("BeforeToolCall", { id: "late", timeoutMs: 10, handle: (_data, { signal }) => {
    hookSignal = signal;
    return new Promise<HookDecision>((resolve) => { release = resolve; });
  } });
  const outcome = await f.kernel.run(request());
  assert.equal(outcome.status, "failed");
  if (outcome.status === "failed") assert.match(outcome.error, /timed out/);
  assert.equal(hookSignal?.aborted, true);
  release({ effect: "continue" });
  await Promise.resolve();
  assert.equal(f.executed.length, 0);
  assert.equal(f.traces.list(outcome.traceId).filter((e) => e.name === "late" && e.status !== "started").length, 1);
});

test("handler snapshots cannot rewrite approved arguments or tool results", async () => {
  const f = fixture();
  f.hooks.addGuard("BeforeToolCall", { id: "mutate", handle: ({ call: input }) => {
    (input.arguments as { topic: string }).topic = "changed";
    return { effect: "continue" };
  } });
  let nextTopic: unknown;
  f.hooks.addGuard("BeforeToolCall", { id: "check-copy", handle: ({ call: input }) => {
    nextTopic = (input.arguments as { topic: string }).topic;
    return { effect: "continue" };
  } });
  f.hooks.addObserver("AfterToolCall", { id: "mutate-result", handle: ({ result }) => {
    (result as ToolResult).content = "changed";
  } });
  await f.kernel.run(request());
  assert.equal(nextTopic, "fractions");
  assert.deepEqual(f.executed, [{ topic: "fractions" }]);
  assert.ok(f.model.requests[1]?.messages.some((m) => m.role === "tool" && m.content.includes("original")));
});

for (const event of ["BeforeToolCall", "BeforeFinish"] as const) {
  test("cancellation during " + event + " ends once without continuing", { timeout: 2000 }, async () => {
    const f = fixture(event === "BeforeFinish" ? [answer] : undefined);
    const controller = new AbortController();
    let entered!: () => void;
    const ready = new Promise<void>((resolve) => { entered = resolve; });
    f.hooks.addGuard(event, { id: "wait", handle: () => {
      entered(); return new Promise(() => {});
    } });
    const endings: string[] = [];
    let cleanupWasAborted: boolean | undefined;
    f.hooks.addObserver("RunEnd", { id: "cleanup", handle: ({ outcome }, { signal }) => {
      endings.push(outcome.status); cleanupWasAborted = signal.aborted;
    } });
    const pending = f.kernel.run({ ...request(), signal: controller.signal });
    await ready;
    controller.abort();
    assert.equal((await pending).status, "cancelled");
    assert.equal(f.executed.length, 0);
    assert.equal(f.model.requests.length, 1);
    assert.deepEqual(endings, ["cancelled"]);
    assert.equal(cleanupWasAborted, false);
  });
}

test("repeated completion blocks remain bounded and expose the attempt number", async () => {
  const f = fixture([answer, answer, answer]);
  const attempts: number[] = [];
  f.hooks.addGuard("BeforeFinish", { id: "acceptance", handle: ({ attempt }) => {
    attempts.push(attempt); return { effect: "block", reason: "Need evidence" };
  } });
  const endings: string[] = [];
  f.hooks.addObserver("RunEnd", { id: "end", handle: ({ outcome }) => { endings.push(outcome.status); } });
  assert.equal((await f.kernel.run(request())).status, "failed");
  assert.deepEqual(attempts, [1, 2, 3]);
  assert.deepEqual(endings, ["failed"]);
});

test("RunEnd observes waiting and model errors without invoking completion guards", async () => {
  for (const decisions of [[{ type: "request_input", question: "Which topic?" }], []] as ModelDecision[][]) {
    const f = fixture(decisions);
    const endings: string[] = [];
    let finishChecks = 0;
    f.hooks.addObserver("RunEnd", { id: "end", handle: ({ outcome }) => { endings.push(outcome.status); } });
    f.hooks.addGuard("BeforeFinish", { id: "finish", handle: () => {
      finishChecks += 1; return { effect: "continue" };
    } });
    const outcome = await f.kernel.run(request());
    assert.deepEqual(endings, [decisions.length ? "waiting" : "failed"]);
    assert.equal(finishChecks, 0);
    assert.equal(f.traces.list(outcome.traceId).filter((e) => e.name === "agent.run" && e.status !== "started").length, 1);
  }
});

test("invalid hook identities and deadlines are rejected at registration", () => {
  const hooks = new RuntimeHooks(new InMemoryTraceStore());
  const handle = () => {};
  hooks.addObserver("RunStart", { id: "metric", handle });
  assert.throws(() => hooks.addObserver("RunEnd", { id: "metric", handle }), /unique/);
  assert.throws(() => hooks.addObserver("RunEnd", { id: " ", handle }), /non-empty/);
  for (const timeoutMs of [0, -1, NaN, Infinity, 2 ** 31]) {
    assert.throws(() => hooks.addObserver("RunEnd", { id: "bad", timeoutMs, handle }), /timeoutMs/);
  }
});
