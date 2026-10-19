import { AgentKernel } from "./agent.js";
import { ScriptedModel } from "./model.js";
import { InMemoryScheduler } from "./scheduler.js";
import { runStudyWorkflow, verifyStudyPlan } from "./study-workflow.js";
import { InMemoryTraceStore } from "./trace.js";
import { BasicPolicyEngine, ToolExecutor, ToolRegistry } from "./tools.js";

const resources = [{ id: "fractions-1", topic: "fractions" }];
const bad = JSON.stringify({ sessions: [
  { topic: "fractions", minutes: 60, resourceId: "fractions-1" },
] });
const good = JSON.stringify({ sessions: [
  { topic: "fractions", minutes: 20, resourceId: "fractions-1" },
] });
console.log("single-prompt candidate:", verifyStudyPlan(bad, {
  topics: ["fractions"], minutes: 30,
}, resources));

const model = new ScriptedModel([
  { type: "answer", content: bad },
  { type: "answer", content: good },
]);
const traces = new InMemoryTraceStore();
const outcome = await runStudyWorkflow({
  evidence: [{ topic: "fractions", needsPractice: true }],
  minutes: 30,
  lookup: async () => resources[0]!,
  model,
  traces,
});
console.log("verified workflow:", outcome.status, "model calls:", model.requests.length);
if ("traceId" in outcome) {
  console.log("acceptance checks:", traces.list(outcome.traceId)
    .filter((event) => event.name === "goal.verify").map((event) => event.status));
}
console.log("missing evidence:", (await runStudyWorkflow({
  evidence: [], minutes: 30, lookup: async () => resources[0]!,
  model: new ScriptedModel([]), traces,
})).status);

const registry = new ToolRegistry();
const limited = new AgentKernel(
  new ScriptedModel([{ type: "tool_calls", calls: [
    { id: "1", name: "lookup", arguments: {} },
  ] }]),
  registry, new ToolExecutor(registry, new BasicPolicyEngine(), traces), traces,
  { maxSteps: 2, maxToolCalls: 0, systemInstruction: "Answer without tools." },
);
const stopped = await limited.run({
  threadId: "budget-demo", userId: "student", allowedTools: new Set(),
  observation: { id: "request", modality: "text", source: "demo",
    content: "Make a plan", occurredAt: new Date().toISOString() },
});
console.log("budget:", stopped.status === "failed" ? stopped.error : stopped.status);

const scheduler = new InMemoryScheduler();
const now = new Date("2026-01-01T00:00:00Z");
scheduler.scheduleOnce("study-thread", "weekly-summary", now, 0);
scheduler.scheduleOnce("study-thread", "review-before-exam", now, 10);
scheduler.tick(now);
console.log("first ready job:", scheduler.claim("worker", now, 1000)?.taskName);
