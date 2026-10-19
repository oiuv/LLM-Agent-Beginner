import { InMemoryTraceStore } from "./trace.js";
import type { ProposedToolCall, RunOutcome, ToolResult } from "./types.js";

export interface RunIdentity {
  traceId: string;
  threadId: string;
  userId: string;
}

interface HookEvents {
  RunStart: RunIdentity;
  BeforeToolCall: RunIdentity & { call: ProposedToolCall };
  AfterToolCall: RunIdentity & { call: ProposedToolCall; result: ToolResult };
  BeforeFinish: RunIdentity & { answer: string; attempt: number };
  RunEnd: RunIdentity & { outcome: RunOutcome };
}

type ObserverEvent = "RunStart" | "AfterToolCall" | "RunEnd";
type GuardEvent = "BeforeToolCall" | "BeforeFinish";
type Snapshot<T> = { readonly [K in keyof T]: T[K] extends object ? Snapshot<T[K]> : T[K] };
export type HookDecision = { effect: "continue" } | { effect: "block"; reason: string };
interface HookContext { signal: AbortSignal }
interface Registration<E extends keyof HookEvents, R> {
  id: string;
  timeoutMs?: number;
  handle: (event: Snapshot<HookEvents[E]>, context: HookContext) => R | Promise<R>;
}
interface Entry {
  id: string;
  event: keyof HookEvents;
  timeoutMs: number;
  handle: (event: never, context: HookContext) => unknown;
}

export class HookExecutionError extends Error {}

/** Trusted, in-process callbacks. This is not a sandbox or a vendor protocol adapter. */
export class RuntimeHooks {
  private readonly entries: Entry[] = [];

  constructor(private readonly traces: InMemoryTraceStore) {}

  addObserver<E extends ObserverEvent>(event: E, hook: Registration<E, void>): void {
    this.register(event, hook);
  }

  addGuard<E extends GuardEvent>(event: E, hook: Registration<E, HookDecision>): void {
    this.register(event, hook);
  }

  private register<E extends keyof HookEvents, R>(event: E, hook: Registration<E, R>): void {
    const timeoutMs = hook.timeoutMs ?? 1000;
    if (!hook.id.trim() || this.entries.some((entry) => entry.id === hook.id)) {
      throw new Error("Hook id must be non-empty and unique: " + hook.id);
    }
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647) {
      throw new Error("Hook timeoutMs must be a positive 32-bit integer");
    }
    this.entries.push({ id: hook.id, event, timeoutMs, handle: hook.handle });
  }

  async observe<E extends ObserverEvent>(event: E, data: HookEvents[E], signal?: AbortSignal): Promise<void> {
    for (const entry of this.entries.filter((entry) => entry.event === event)) {
      if (signal?.aborted) break;
      try {
        await this.invoke(entry, data, false, signal);
      } catch {
        // Observers cannot change the outcome. Failure is already recorded in Trace.
      }
    }
  }

  async check<E extends GuardEvent>(event: E, data: HookEvents[E], signal: AbortSignal): Promise<HookDecision> {
    for (const entry of this.entries.filter((entry) => entry.event === event)) {
      if (signal.aborted) throw new HookExecutionError("Hook cancelled");
      const decision = await this.invoke(entry, data, true, signal) as HookDecision;
      if (decision.effect === "block") return decision;
    }
    return { effect: "continue" };
  }

  private async invoke(entry: Entry, data: RunIdentity, guard: boolean, signal?: AbortSignal): Promise<unknown> {
    const started = Date.now();
    this.traces.append({
      traceId: data.traceId, type: "hook", name: entry.id, status: "started",
      attributes: { event: entry.event },
    });
    let outcome = "continue";
    let status: "ok" | "error" | "cancelled" = "ok";
    try {
      // Each handler gets its own copy; changing it cannot rewrite an approved call.
      const snapshot = structuredClone(data);
      const result = await withDeadline(
        (hookSignal) => entry.handle(snapshot as never, { signal: hookSignal }),
        entry.timeoutMs, signal,
      );
      if (guard && !isDecision(result)) throw new Error("Invalid Hook decision");
      if (guard && isDecision(result)) {
        outcome = result.effect;
        if (result.effect === "block") status = "error";
      }
      return result;
    } catch (error) {
      status = signal?.aborted ? "cancelled" : "error";
      outcome = status;
      throw new HookExecutionError("Hook " + entry.id + " failed: " +
        (error instanceof Error ? error.message : String(error)));
    } finally {
      this.traces.append({
        traceId: data.traceId, type: "hook", name: entry.id, status,
        // Do not log raw arguments, answers, results or exception bodies here.
        attributes: { event: entry.event, outcome, durationMs: Date.now() - started },
      });
    }
  }
}

function isDecision(value: unknown): value is HookDecision {
  if (typeof value !== "object" || value === null || !("effect" in value)) return false;
  return value.effect === "continue" || (value.effect === "block" &&
    "reason" in value && typeof value.reason === "string" && value.reason.trim() !== "");
}

async function withDeadline(
  handle: (signal: AbortSignal) => unknown,
  timeoutMs: number,
  parent?: AbortSignal,
): Promise<unknown> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel = () => {};
  try {
    const deadline = new Promise<never>((_resolve, reject) => {
      cancel = () => {
        reject(new Error("Hook cancelled"));
        controller.abort();
      };
      if (parent?.aborted) { cancel(); return; }
      parent?.addEventListener("abort", cancel, { once: true });
      timer = setTimeout(() => {
        reject(new Error("Hook timed out"));
        controller.abort();
      }, timeoutMs);
    });
    const execution = Promise.resolve().then(() => {
      if (controller.signal.aborted) throw new Error("Hook cancelled");
      return handle(controller.signal);
    });
    return await Promise.race([deadline, execution]);
  } finally {
    clearTimeout(timer);
    parent?.removeEventListener("abort", cancel);
    controller.abort();
  }
}
