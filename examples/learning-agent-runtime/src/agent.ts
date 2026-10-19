import { randomUUID } from "node:crypto";
import type { AgentRunRequest, ModelMessage, ModelProvider, RunOutcome, ToolResult } from "./types.js";
import { RuntimeHooks, type RunIdentity } from "./hooks.js";
import { InMemoryTraceStore } from "./trace.js";
import { ToolExecutor, ToolRegistry } from "./tools.js";

export interface AgentKernelOptions {
  maxSteps: number;
  maxToolCalls?: number;
  hooks?: RuntimeHooks;
  systemInstruction: string;
}

export class AgentKernel {
  private readonly hooks: RuntimeHooks;

  constructor(
    private readonly model: ModelProvider,
    private readonly registry: ToolRegistry,
    private readonly executor: ToolExecutor,
    private readonly traces: InMemoryTraceStore,
    private readonly options: AgentKernelOptions = {
      maxSteps: 8,
      systemInstruction: "你是指导学习 Agent。使用工具前确认目标，依据工具结果回答。",
    },
  ) {
    if (!Number.isInteger(options.maxSteps) || options.maxSteps < 1) {
      throw new Error("maxSteps must be a positive integer");
    }
    const maxToolCalls = options.maxToolCalls ?? 16;
    if (!Number.isInteger(maxToolCalls) || maxToolCalls < 0) {
      throw new Error("maxToolCalls must be a non-negative integer");
    }
    this.hooks = options.hooks ?? new RuntimeHooks(traces);
  }

  async run(request: AgentRunRequest): Promise<RunOutcome> {
    const identity: RunIdentity = {
      traceId: randomUUID(), threadId: request.threadId, userId: request.userId,
    };
    const signal = request.signal ?? new AbortController().signal;
    const progress = { steps: 0 };
    let outcome: RunOutcome = { status: "failed", traceId: identity.traceId, error: "Run did not finish" };
    this.traces.append({
      traceId: identity.traceId, type: "run", name: "agent.run", status: "started",
      attributes: { threadId: request.threadId, source: request.observation.source },
    });
    try {
      await this.hooks.observe("RunStart", identity, signal);
      outcome = await this.runLoop(request, identity, signal, progress);
    } catch (error) {
      outcome = signal.aborted
        ? { status: "cancelled", traceId: identity.traceId }
        : { status: "failed", traceId: identity.traceId,
            error: error instanceof Error ? error.message : String(error) };
    } finally {
      this.traces.append({
        traceId: identity.traceId, type: "run", name: "agent.run",
        status: outcome.status === "failed" ? "error" : outcome.status === "cancelled" ? "cancelled" : "ok",
        attributes: { steps: progress.steps, outcome: outcome.status },
      });
      // RunEnd is observation only. Its own deadline allows bounded cleanup after cancellation.
      await this.hooks.observe("RunEnd", { ...identity, outcome });
    }
    return outcome;
  }

  private async runLoop(
    request: AgentRunRequest,
    identity: RunIdentity,
    signal: AbortSignal,
    progress: { steps: number },
  ): Promise<RunOutcome> {
    const { traceId } = identity;
    const messages: ModelMessage[] = [
      { role: "system", content: this.options.systemInstruction },
      { role: "user", content: formatObservation(request.observation.content) },
    ];
    const artifactIds: string[] = [];
    let toolCalls = 0;
    let finishAttempts = 0;
    const approvedCallIds = request.approvedCallIds ?? new Set<string>();

    for (let step = 0; step < this.options.maxSteps; step += 1) {
      if (signal.aborted) return { status: "cancelled", traceId };
      progress.steps = step + 1;
      const tools = this.registry.describe(request.allowedTools);
      this.traces.append({
        traceId, type: "model", name: "model.decide", status: "started",
        attributes: { step, toolCount: tools.length },
      });

      let decision;
      try {
        decision = await this.model.decide({ messages, tools, signal });
      } catch (error) {
        if (signal.aborted) return { status: "cancelled", traceId };
        const message = error instanceof Error ? error.message : "Model request failed";
        this.traces.append({
          traceId, type: "model", name: "model.decide", status: "error",
          attributes: { step, error: message },
        });
        throw error;
      }
      this.traces.append({
        traceId, type: "model", name: "model.decide", status: "ok",
        attributes: { step, decision: decision.type },
      });
      if (signal.aborted) return { status: "cancelled", traceId };

      if (decision.type === "answer") {
        const check = await this.hooks.check("BeforeFinish", {
          ...identity, answer: decision.content, attempt: ++finishAttempts,
        }, signal);
        if (signal.aborted) return { status: "cancelled", traceId };
        if (check.effect === "block") {
          messages.push(
            { role: "assistant", content: decision.content },
            { role: "system", content: "Acceptance check failed. Revise the answer: " + check.reason },
          );
          continue;
        }
        return { status: "completed", traceId, answer: decision.content, artifactIds };
      }

      if (decision.type === "request_input") {
        return { status: "waiting", traceId, reason: "user_input", prompt: decision.question };
      }

      messages.push({
        role: "assistant",
        content: JSON.stringify({ toolCalls: decision.calls.map((call) => ({ id: call.id, name: call.name })) }),
      });
      for (const call of decision.calls) {
        if (toolCalls >= (this.options.maxToolCalls ?? 16)) {
          this.traces.append({
            traceId, type: "run", name: "budget.exhausted", status: "error",
            attributes: { toolCalls },
          });
          return { status: "failed", traceId, error: "Agent exceeded tool call budget" };
        }
        // Rejected attempts count too. Hooks cannot expand this budget.
        toolCalls += 1;
        const result = await this.executor.execute(
          call, { ...identity, signal }, request.allowedTools, approvedCallIds, this.hooks,
        );
        if (signal.aborted) return { status: "cancelled", traceId };
        if (result.error?.code === "APPROVAL_REQUIRED") {
          return { status: "waiting", traceId, reason: "approval", prompt: result.error.message };
        }
        artifactIds.push(...(result.artifactIds ?? []));
        messages.push(asToolMessage(call.id, call.name, result));
      }
    }
    return { status: "failed", traceId, error: "Agent exceeded max steps" };
  }
}

function asToolMessage(toolCallId: string, name: string, result: ToolResult): ModelMessage {
  return { role: "tool", toolCallId, name, content: JSON.stringify(result) };
}

function formatObservation(content: unknown): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}
