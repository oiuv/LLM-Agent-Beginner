import { randomUUID } from "node:crypto";
import type {
  AgentRunRequest,
  ModelMessage,
  ModelProvider,
  RunOutcome,
  ToolResult,
} from "./types.js";
import { InMemoryTraceStore } from "./trace.js";
import { ToolExecutor, ToolRegistry } from "./tools.js";

export interface AnswerVerification {
  passed: boolean;
  feedback: string;
}

export interface AgentKernelOptions {
  maxSteps: number;
  maxToolCalls?: number;
  verifyAnswer?: (answer: string) => AnswerVerification;
  systemInstruction: string;
}

export class AgentKernel {
  constructor(
    private readonly model: ModelProvider,
    private readonly registry: ToolRegistry,
    private readonly executor: ToolExecutor,
    private readonly traces: InMemoryTraceStore,
    private readonly options: AgentKernelOptions = {
      maxSteps: 8,
      systemInstruction:
        "你是指导学习 Agent。使用工具前确认目标，依据工具结果回答。",
    },
  ) {
    if (!Number.isInteger(options.maxSteps) || options.maxSteps < 1) {
      throw new Error("maxSteps must be a positive integer");
    }
    const maxToolCalls = options.maxToolCalls ?? 16;
    if (!Number.isInteger(maxToolCalls) || maxToolCalls < 0) {
      throw new Error("maxToolCalls must be a non-negative integer");
    }
  }

  async run(request: AgentRunRequest): Promise<RunOutcome> {
    const traceId = randomUUID();
    const controller = new AbortController();
    const signal = request.signal ?? controller.signal;
    const messages: ModelMessage[] = [
      { role: "system", content: this.options.systemInstruction },
      {
        role: "user",
        content: formatObservation(request.observation.content),
      },
    ];
    const artifactIds: string[] = [];
    let toolCalls = 0;
    const approvedCallIds = request.approvedCallIds ?? new Set<string>();

    this.traces.append({
      traceId,
      type: "run",
      name: "agent.run",
      status: "started",
      attributes: {
        threadId: request.threadId,
        source: request.observation.source,
      },
    });

    for (let step = 0; step < this.options.maxSteps; step += 1) {
      if (signal.aborted) {
        this.finishTrace(traceId, "cancelled", step);
        return { status: "cancelled", traceId };
      }

      const tools = this.registry.describe(request.allowedTools);
      this.traces.append({
        traceId,
        type: "model",
        name: "model.decide",
        status: "started",
        attributes: { step, toolCount: tools.length },
      });

      let decision;
      try {
        decision = await this.model.decide({ messages, tools, signal });
      } catch (error) {
        if (signal.aborted) {
          this.finishTrace(traceId, "cancelled", step + 1);
          return { status: "cancelled", traceId };
        }
        const message =
          error instanceof Error ? error.message : "Model request failed";
        this.traces.append({
          traceId,
          type: "model",
          name: "model.decide",
          status: "error",
          attributes: { step, error: message },
        });
        this.finishTrace(traceId, "error", step);
        return { status: "failed", traceId, error: message };
      }

      this.traces.append({
        traceId,
        type: "model",
        name: "model.decide",
        status: "ok",
        attributes: { step, decision: decision.type },
      });

      if (signal.aborted) {
        this.finishTrace(traceId, "cancelled", step + 1);
        return { status: "cancelled", traceId };
      }

      if (decision.type === "answer") {
        if (this.options.verifyAnswer) {
          let verification: AnswerVerification;
          try {
            verification = this.options.verifyAnswer(decision.content);
          } catch (error) {
            this.finishTrace(traceId, "error", step + 1);
            return {
              status: "failed",
              traceId,
              error: "Answer verification failed: " +
                (error instanceof Error ? error.message : String(error)),
            };
          }
          this.traces.append({
            traceId,
            type: "run",
            name: "goal.verify",
            status: verification.passed ? "ok" : "error",
            attributes: { step, feedback: verification.feedback },
          });
          if (!verification.passed) {
            messages.push(
              { role: "assistant", content: decision.content },
              {
                role: "system",
                content: "Acceptance check failed. Revise the answer: " +
                  verification.feedback,
              },
            );
            continue;
          }
        }
        this.finishTrace(traceId, "ok", step + 1);
        return {
          status: "completed",
          traceId,
          answer: decision.content,
          artifactIds,
        };
      }

      if (decision.type === "request_input") {
        this.traces.append({
          traceId,
          type: "run",
          name: "agent.waiting_user",
          status: "ok",
          attributes: { step },
        });
        return {
          status: "waiting",
          traceId,
          reason: "user_input",
          prompt: decision.question,
        };
      }

      messages.push({
        role: "assistant",
        content: JSON.stringify({
          toolCalls: decision.calls.map((call) => ({
            id: call.id,
            name: call.name,
          })),
        }),
      });

      for (const call of decision.calls) {
        if (toolCalls >= (this.options.maxToolCalls ?? 16)) {
          this.traces.append({
            traceId,
            type: "run",
            name: "budget.exhausted",
            status: "error",
            attributes: { toolCalls },
          });
          this.finishTrace(traceId, "error", step + 1);
          return { status: "failed", traceId, error: "Agent exceeded tool call budget" };
        }
        // Count attempts, including rejected calls, so invalid proposals cannot loop freely.
        toolCalls += 1;
        const result = await this.executor.execute(
          call,
          {
            userId: request.userId,
            threadId: request.threadId,
            traceId,
            signal,
          },
          request.allowedTools,
          approvedCallIds,
        );

        if (signal.aborted) {
          this.finishTrace(traceId, "cancelled", step + 1);
          return { status: "cancelled", traceId };
        }

        if (result.error?.code === "APPROVAL_REQUIRED") {
          this.traces.append({
            traceId,
            type: "run",
            name: "agent.waiting_approval",
            status: "ok",
            attributes: { step, callId: call.id, tool: call.name },
          });
          return {
            status: "waiting",
            traceId,
            reason: "approval",
            prompt: result.error.message,
          };
        }

        artifactIds.push(...(result.artifactIds ?? []));
        messages.push(asToolMessage(call.id, call.name, result));
      }
    }

    this.finishTrace(traceId, "error", this.options.maxSteps);
    return {
      status: "failed",
      traceId,
      error: "Agent exceeded max steps",
    };
  }

  private finishTrace(
    traceId: string,
    status: "ok" | "error" | "cancelled",
    steps: number,
  ): void {
    this.traces.append({
      traceId,
      type: "run",
      name: "agent.run",
      status,
      attributes: { steps },
    });
  }
}

function asToolMessage(
  toolCallId: string,
  name: string,
  result: ToolResult,
): ModelMessage {
  return {
    role: "tool",
    toolCallId,
    name,
    content: JSON.stringify(result),
  };
}

function formatObservation(content: unknown): string {
  return typeof content === "string" ? content : JSON.stringify(content);
}

