/**
 * Per-call memory for the realtime (speech-to-speech) voice agent.
 *
 * Decides, once per call and before anything else is wired, whether this call
 * may be remembered: the room metadata must carry a memory binding that
 * verifies against the shared secret and the actual room name. If it does, a
 * NeuroLink instance is built, the conversation's recent history is read for
 * seeding, and a turn recorder is created that writes each finished exchange
 * through `recordConversationTurn`. If it does not, the call proceeds exactly
 * as it would without memory, and a warning says why (never the ids).
 *
 * The shutdown flush is registered here, before the job lifecycle installs its
 * process reaper. LiveKit starts every shutdown callback in registration order
 * and the reaper exits the process about a second later, so the flush gets a
 * budget below that second and starts first. The same budget bounds delivery of
 * the call's last traces, which go out while the last writes finish.
 *
 * Each turn is traced as it closes, never behind the store's one-at-a-time
 * writes, so a slow or stuck store cannot delay or lose a trace.
 *
 * Tracing does not depend on memory. A call with no memory still gets a
 * recorder that only traces its turns (`setUpRealtimeCallTracing`).
 *
 * See docs/features/livekit-voice-agent.md.
 */

import type { JobContext } from "@livekit/agents";
import { context, trace } from "@opentelemetry/api";
import { AIProviderName } from "../../constants/enums.js";
import {
  flushOpenTelemetry,
  isOpenTelemetryInitialized,
  setLangfuseContext,
} from "../../services/server/ai/observability/instrumentation.js";
import { isLangfuseEnabled } from "../../services/server/ai/observability/langfuseSetup.js";
import { observe, observeTrace } from "../../telemetry/observation.js";
import { tracers } from "../../telemetry/tracers.js";
import { logger } from "../../utils/logger.js";
import {
  VOICE_MEMORY_SECRET_ENV,
  verifyVoiceMemoryBinding,
} from "./memoryBinding.js";
import { createVoiceTurnRecorder } from "./turnRecorder.js";
import type {
  ConversationSeedMessage,
  LiveKitVoiceEventType,
  RealtimeCallMemory,
  RealtimeTracedCall,
  RealtimeVoiceBackend,
  RealtimeVoiceMemoryConfig,
  VoiceTurnRecord,
  VoiceTurnRecorder,
  VoiceTurnRecorderStats,
} from "../../types/index.js";

const DEFAULT_FLUSH_BUDGET_MS = 800;

/** The provider a backend's turn spans are attributed to: Gemini Live runs on Vertex AI, Grok Voice on xAI. */
const TRACE_PROVIDER: Record<RealtimeVoiceBackend, AIProviderName> = {
  gemini: AIProviderName.VERTEX,
  xai: AIProviderName.XAI,
};

function traceTurn(turn: VoiceTurnRecord, call: RealtimeTracedCall): void {
  const {
    sessionId,
    userId,
    roomName,
    model,
    provider = AIProviderName.VERTEX,
  } = call;
  try {
    setLangfuseContext(
      {
        sessionId,
        userId,
        tags: ["voice"],
        traceName: "realtime-turn",
        metadata: { roomName },
      },
      () => {
        const level = turn.interrupted ? "WARNING" : undefined;
        const endTime = new Date();
        const root = tracers.sdk.startSpan("realtime-turn", {
          startTime: turn.startTime,
        });
        // The root and each child end on every path, so a failure while
        // describing one tool cannot leave the turn open and unexported.
        try {
          observe(root, "agent", {
            input: turn.userMessage,
            output: turn.aiResponse,
            level,
          });
          observeTrace(root, {
            input: turn.userMessage,
            output: turn.aiResponse,
          });
          const inRoot = trace.setSpan(context.active(), root);
          const generation = tracers.generation.startSpan(
            "realtime",
            { startTime: turn.startTime },
            inRoot,
          );
          try {
            observe(generation, "generation", {
              ...(model && { model }),
              input: [{ role: "user", content: turn.userMessage }],
              output: [{ role: "assistant", content: turn.aiResponse }],
              level,
              metadata: { provider },
            });
          } finally {
            generation.end(endTime);
          }

          const events = turn.events ?? [];
          const consumed = new Set<number>();
          for (const start of events.filter((e) => e.type === "tool:start")) {
            // A call id pairs overlapping calls exactly; without one, each end
            // is spent on the earliest unpaired start of the same tool.
            const end = events.find(
              (e) =>
                e.type === "tool:end" &&
                e.seq > start.seq &&
                !consumed.has(e.seq) &&
                (start.callId !== undefined
                  ? e.callId === start.callId
                  : e.tool === start.tool),
            );
            if (end) {
              consumed.add(end.seq);
            }
            const tool = tracers.sdk.startSpan(
              String(start.tool),
              { startTime: start.timestamp },
              inRoot,
            );
            try {
              observe(tool, "tool", {
                input: start.args,
                output: end?.result ?? end?.error,
                level: end?.success === false ? "ERROR" : undefined,
              });
            } finally {
              tool.end(Math.min(end?.timestamp ?? Infinity, endTime.getTime()));
            }
          }
        } finally {
          root.end(endTime);
        }
      },
    );
  } catch (error) {
    logger.debug("realtime.memory.traceFailed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/** A tracer that spends one trace per turn id. */
function createTurnTracer(
  call: RealtimeTracedCall,
): (turn: VoiceTurnRecord) => void {
  const tracedTurns = new Set<string>();
  return (turn) => {
    if (!tracedTurns.has(turn.turnId)) {
      tracedTurns.add(turn.turnId);
      traceTurn(turn, call);
    }
  };
}

/** Deliver buffered traces, giving up after `budgetMs`: the worker is reaped about a second after shutdown starts. */
async function flushTraces(budgetMs: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      flushOpenTelemetry(),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, Math.max(0, budgetMs));
      }),
    ]);
  } catch (error) {
    logger.debug("realtime.memory.traceFlushFailed", {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Shutdown: close the open exchange, then deliver every trace while its writes finish, all within one budget. */
async function flushCall(
  recorder: VoiceTurnRecorder,
  budgetMs: number,
): Promise<VoiceTurnRecorderStats> {
  // flush() closes, and so traces, the open exchange before it first waits.
  const [stats] = await Promise.all([
    recorder.flush(budgetMs),
    flushTraces(budgetMs),
  ]);
  return stats;
}

/**
 * Prepare a recorder that only traces: for a call with no usable memory. Returns
 * `undefined` when tracing is off. Without a verified binding there is no user,
 * so the room is the session.
 */
export function setUpRealtimeCallTracing(
  ctx: Pick<JobContext, "room" | "addShutdownCallback">,
  options: {
    model?: string;
    backend?: RealtimeVoiceBackend;
    settleMs?: number;
    flushBudgetMs?: number;
  } = {},
): VoiceTurnRecorder | undefined {
  if (!isLangfuseEnabled() && !isOpenTelemetryInitialized()) {
    return undefined;
  }
  const trace = createTurnTracer({
    sessionId: ctx.room.name,
    roomName: ctx.room.name,
    model: options.model,
    provider: TRACE_PROVIDER[options.backend ?? "gemini"],
  });
  const recorder = createVoiceTurnRecorder({
    ...(options.settleMs !== undefined ? { settleMs: options.settleMs } : {}),
    onClosed: trace,
    write: () => Promise.resolve(),
  });
  ctx.addShutdownCallback(async () => {
    const stats = await flushCall(
      recorder,
      options.flushBudgetMs ?? DEFAULT_FLUSH_BUDGET_MS,
    );
    logger.info("realtime.trace.flushed", { ...stats });
  });
  return recorder;
}

/**
 * Verify the call's binding and prepare its recorder; `undefined` means "no
 * memory for this call". `call` names the model and the realtime backend the
 * call runs on, which the turn spans carry as `model` and `provider`; the
 * backend defaults to `gemini`, the original and default one.
 */
export async function setUpRealtimeCallMemory(
  ctx: Pick<JobContext, "room" | "addShutdownCallback">,
  config: RealtimeVoiceMemoryConfig | undefined,
  call: { model?: string; backend?: RealtimeVoiceBackend } = {},
): Promise<RealtimeCallMemory | undefined> {
  const { model, backend = "gemini" } = call;
  if (!config) {
    return undefined;
  }
  const verdict = verifyVoiceMemoryBinding({
    roomMetadata: ctx.room.metadata,
    roomName: ctx.room.name,
    secret: config.secret ?? process.env[VOICE_MEMORY_SECRET_ENV],
  });
  if (!verdict.ok) {
    logger.warn("realtime.memory.bindingRejected", {
      reason: verdict.reason,
      action: "continuing-without-memory",
    });
    return undefined;
  }
  const { userId, sessionId } = verdict;

  let neurolink: Awaited<
    ReturnType<RealtimeVoiceMemoryConfig["createNeuroLink"]>
  >;
  try {
    neurolink = await config.createNeuroLink();
  } catch (error) {
    logger.error("realtime.memory.setupFailed", {
      error: error instanceof Error ? error.message : String(error),
      action: "continuing-without-memory",
    });
    return undefined;
  }

  let publish:
    | ((type: LiveKitVoiceEventType, data: Record<string, unknown>) => void)
    | undefined;
  const trace = createTurnTracer({
    sessionId,
    userId,
    roomName: ctx.room.name,
    model,
    provider: TRACE_PROVIDER[backend],
  });
  const recorder = createVoiceTurnRecorder({
    ...(config.settleMs !== undefined ? { settleMs: config.settleMs } : {}),
    onClosed: trace,
    write: async (turn) => {
      const result = await neurolink.recordConversationTurn({
        sessionId,
        userId,
        userMessage: turn.userMessage,
        aiResponse: turn.aiResponse,
        modality: "voice",
        turnId: turn.turnId,
        interrupted: turn.interrupted,
        callEnded: turn.callEnded,
        startTime: turn.startTime,
        ...(turn.events ? { events: turn.events } : {}),
      });
      if (!result.recorded) {
        logger.debug("realtime.memory.turnSkipped", {
          reason: result.reason,
          turnId: turn.turnId,
        });
      }
    },
    onPermanentFailure: (turn) => {
      publish?.("memory", { state: "not-saved", turnId: turn.turnId });
    },
  });
  ctx.addShutdownCallback(async () => {
    const stats = await flushCall(
      recorder,
      config.flushBudgetMs ?? DEFAULT_FLUSH_BUDGET_MS,
    );
    logger.info("realtime.memory.flushed", { ...stats });
  });

  let seed: ConversationSeedMessage[] = [];
  if (config.seed !== false && neurolink.getConversationSeed) {
    try {
      seed = await neurolink.getConversationSeed({
        sessionId,
        userId,
        ...(config.seed?.maxTurns !== undefined
          ? { maxTurns: config.seed.maxTurns }
          : {}),
        ...(config.seed?.maxChars !== undefined
          ? { maxChars: config.seed.maxChars }
          : {}),
      });
    } catch (error) {
      logger.warn("realtime.memory.seedFailed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  logger.info("realtime.memory.enabled", { seeded: seed.length });

  return {
    recorder,
    seed,
    setPublisher: (publisher) => {
      publish = publisher;
    },
  };
}
