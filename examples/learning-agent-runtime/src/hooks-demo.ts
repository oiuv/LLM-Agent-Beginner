import { AgentKernel } from "./agent.js";
import { RuntimeHooks } from "./hooks.js";
import { ScriptedModel } from "./model.js";
import { InMemoryTraceStore } from "./trace.js";
import { BasicPolicyEngine, ToolExecutor, ToolRegistry } from "./tools.js";

const traces = new InMemoryTraceStore();
const hooks = new RuntimeHooks(traces);
const registry = new ToolRegistry();
let executions = 0;
registry.register({
  name: "read_resource", version: "1", description: "Read a mock learning resource",
  inputSchema: { type: "object", properties: { topic: { type: "string" } }, required: ["topic"] },
  sideEffect: "read",
  validate(input) {
    if (typeof input !== "object" || input === null || !("topic" in input) || typeof input.topic !== "string") {
      throw new Error("topic must be a string");
    }
    return { topic: input.topic };
  },
  async execute() { executions += 1; return { ok: true, content: { resourceId: "r1", topic: "fractions" } }; },
});
hooks.addObserver("RunStart", {
  id: "start-log", handle: () => { console.log("RunStart: 开始学习任务"); },
});
hooks.addGuard("BeforeToolCall", {
  id: "topic-scope",
  handle: ({ call }) => (call.arguments as { topic: string }).topic === "fractions"
    ? { effect: "continue" } : { effect: "block", reason: "Only fractions is in this lesson." },
});
hooks.addObserver("AfterToolCall", {
  id: "metrics", handle: () => { throw new Error("Mock metrics service unavailable"); },
});
hooks.addGuard("BeforeFinish", {
  id: "answer-evidence",
  // A tiny delivery-contract check; it does not establish factual or teaching quality.
  handle: ({ answer }) => answer.includes("resource:r1")
    ? { effect: "continue" } : { effect: "block", reason: "Include the resource:r1 reference." },
});
hooks.addObserver("RunEnd", {
  id: "end-log", handle: ({ outcome }) => { console.log("RunEnd:", outcome.status); },
});
const model = new ScriptedModel([
  { type: "tool_calls", calls: [{ id: "wrong-topic", name: "read_resource", arguments: { topic: "unknown" } }] },
  { type: "tool_calls", calls: [{ id: "right-topic", name: "read_resource", arguments: { topic: "fractions" } }] },
  { type: "answer", content: "练习分数。" },
  { type: "answer", content: "使用 resource:r1 练习分数。" },
]);
const kernel = new AgentKernel(model, registry,
  new ToolExecutor(registry, new BasicPolicyEngine(), traces), traces,
  { maxSteps: 4, maxToolCalls: 2, systemInstruction: "Guide a fractions lesson.", hooks });
const outcome = await kernel.run({
  threadId: "hooks-demo", userId: "student", allowedTools: new Set(["read_resource"]),
  observation: { id: "request", modality: "text", source: "demo",
    content: "学习分数", occurredAt: new Date().toISOString() },
});
console.log("实际工具执行次数:", executions);
console.log("模型决策次数:", model.requests.length);
console.table(traces.list(outcome.traceId).filter((e) => e.type === "hook" && e.status !== "started")
  .map((e) => ({ event: e.attributes.event, hook: e.name, outcome: e.attributes.outcome })));
if (outcome.status !== "completed" || executions !== 1 || model.requests.length !== 4) {
  throw new Error("Unexpected Hooks demonstration result");
}
