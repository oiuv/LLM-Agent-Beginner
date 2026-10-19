import { AgentKernel } from "./agent.js";
import { RuntimeHooks } from "./hooks.js";
import { InMemoryTraceStore } from "./trace.js";
import { BasicPolicyEngine, ToolExecutor, ToolRegistry } from "./tools.js";
import type { ModelProvider, RunOutcome } from "./types.js";

export interface Resource {
  id: string;
  topic: string;
}

export interface StudyGoal {
  topics: string[];
  minutes: number;
}

// This checks a delivery contract, not the pedagogical quality of a resource.
export function verifyStudyPlan(
  answer: string,
  goal: StudyGoal,
  resources: Resource[],
): { passed: boolean; feedback: string } {
  let plan: unknown;
  try {
    plan = JSON.parse(answer);
  } catch {
    return { passed: false, feedback: "Return a JSON object with sessions." };
  }
  if (!isRecord(plan) || !Array.isArray(plan.sessions) || plan.sessions.length === 0) {
    return { passed: false, feedback: "sessions must be a non-empty array." };
  }
  let total = 0;
  const covered = new Set<string>();
  for (const session of plan.sessions) {
    if (!isRecord(session) ||
        typeof session.topic !== "string" || !goal.topics.includes(session.topic) ||
        typeof session.minutes !== "number" || !Number.isFinite(session.minutes) ||
        session.minutes <= 0 ||
        !resources.some((r) => r.id === session.resourceId && r.topic === session.topic)) {
      return {
        passed: false,
        feedback: "Each session needs a target topic, positive minutes and a matching resourceId.",
      };
    }
    total += session.minutes;
    covered.add(session.topic);
  }
  const missing = goal.topics.filter((topic) => !covered.has(topic));
  if (missing.length > 0 || total > goal.minutes) {
    return {
      passed: false,
      feedback: "Missing topics: " + missing.join(",") +
        "; total minutes: " + total + "; limit: " + goal.minutes,
    };
  }
  return { passed: true, feedback: "All topics covered within the time limit." };
}

export async function collectResources(
  topics: string[],
  lookup: (topic: string) => Promise<Resource>,
): Promise<{ resources: Resource[]; missing: string[] }> {
  // Only independent read operations run in parallel. One failure is kept visible.
  const results = await Promise.allSettled(topics.map(async (topic) => lookup(topic)));
  const resources: Resource[] = [];
  const missing: string[] = [];
  results.forEach((result, index) => {
    const topic = topics[index]!;
    if (result.status === "fulfilled" && result.value.topic === topic &&
        result.value.id.trim() !== "") {
      resources.push(result.value);
    } else {
      missing.push(topic);
    }
  });
  return { resources, missing };
}

export type StudyWorkflowOutcome =
  | { status: "needs_input"; prompt: string }
  | { status: "missing_resources"; topics: string[] }
  | RunOutcome;

export async function runStudyWorkflow(input: {
  evidence: { topic: string; needsPractice: boolean }[];
  minutes: number;
  lookup: (topic: string) => Promise<Resource>;
  model: ModelProvider;
  traces: InMemoryTraceStore;
}): Promise<StudyWorkflowOutcome> {
  // Routing uses known domain facts; it does not need a second model.
  if (input.evidence.length === 0 || !Number.isFinite(input.minutes) || input.minutes <= 0) {
    return { status: "needs_input", prompt: "Provide assessment evidence and available minutes." };
  }
  const topics = [...new Set(input.evidence.filter((e) => e.needsPractice).map((e) => e.topic))];
  if (topics.length === 0) {
    return { status: "needs_input", prompt: "No practice target found; choose a new assessment goal." };
  }
  const { resources, missing } = await collectResources(topics, input.lookup);
  if (missing.length > 0) return { status: "missing_resources", topics: missing };

  const goal: StudyGoal = { topics, minutes: input.minutes };
  const registry = new ToolRegistry();
  const hooks = new RuntimeHooks(input.traces);
  hooks.addGuard("BeforeFinish", {
    id: "goal.verify",
    handle: ({ answer }) => {
      const result = verifyStudyPlan(answer, goal, resources);
      return result.passed ? { effect: "continue" } : { effect: "block", reason: result.feedback };
    },
  });
  const kernel = new AgentKernel(
    input.model, registry,
    new ToolExecutor(registry, new BasicPolicyEngine(), input.traces),
    input.traces,
    {
      maxSteps: 3,
      maxToolCalls: 0,
      systemInstruction: "Return JSON: {sessions:[{topic,minutes,resourceId}]}. " +
        "Cover every target topic within the total minute limit. Use only supplied resources.",
      hooks,
    },
  );
  return kernel.run({
    threadId: "study-thread",
    userId: "student",
    allowedTools: new Set(),
    observation: {
      id: "study-request",
      modality: "text",
      source: "study-workflow",
      content: { goal, resources },
      occurredAt: new Date().toISOString(),
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
