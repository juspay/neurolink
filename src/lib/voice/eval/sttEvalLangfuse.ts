/**
 * Langfuse export for the STT evaluation collector.
 *
 * Configured only by the server's environment, never by a request or a route
 * option: where evaluation data goes is the operator's decision.
 *
 *   NEUROLINK_STT_EVAL_LANGFUSE_PUBLIC_KEY / _SECRET_KEY   both required
 *   NEUROLINK_STT_EVAL_LANGFUSE_BASE_URL                   default https://cloud.langfuse.com
 *   NEUROLINK_STT_EVAL_LANGFUSE_ENVIRONMENT                optional
 *
 * These are separate from NeuroLink's own `LANGFUSE_*` keys so evaluations
 * land in a project of their own. Each call is one trace (`stt-eval`), each
 * segment one event under it, and the disagreement figures are scores on the
 * trace. Ids are derived from the call and segment ids, so a resent batch
 * updates what it sent before instead of duplicating it. An export never
 * fails or delays the batch that caused it: it runs in the background, in
 * order, and a failure is logged.
 */
import { createHash, randomUUID } from "node:crypto";
import type {
  ServerSTTEvalBatchRequest,
  ServerSTTEvalLangfuseConfig,
  ServerSTTEvalLangfuseEvent,
  ServerSTTEvalReport,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

const DEFAULT_BASE_URL = "https://cloud.langfuse.com";
const REQUEST_TIMEOUT_MS = 15_000;
/** Events per ingestion request, well under Langfuse's request-size limit. */
const EVENTS_PER_REQUEST = 500;

/** The export configuration from the environment, or `undefined` when it is not set up. */
export function sttEvalLangfuseConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): ServerSTTEvalLangfuseConfig | undefined {
  const publicKey = env.NEUROLINK_STT_EVAL_LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = env.NEUROLINK_STT_EVAL_LANGFUSE_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) {
    return undefined;
  }
  const environment = env.NEUROLINK_STT_EVAL_LANGFUSE_ENVIRONMENT?.trim();
  return {
    publicKey,
    secretKey,
    baseUrl: (
      env.NEUROLINK_STT_EVAL_LANGFUSE_BASE_URL?.trim() || DEFAULT_BASE_URL
    ).replace(/\/+$/u, ""),
    ...(environment ? { environment } : {}),
  };
}

export class STTEvalLangfuseExporter {
  private readonly _config: ServerSTTEvalLangfuseConfig;
  private _tail: Promise<void> = Promise.resolve();

  constructor(config: ServerSTTEvalLangfuseConfig) {
    this._config = config;
  }

  /** Queues one batch (and the call's comparison after it) for export. Never throws. */
  export(
    batch: ServerSTTEvalBatchRequest,
    report: ServerSTTEvalReport | undefined,
  ): Promise<void> {
    const events = this._eventsFor(batch, report);
    this._tail = this._tail.then(() => this._send(batch.call_id, events));
    return this._tail;
  }

  /** Resolves once every export queued so far has been attempted. */
  flush(): Promise<void> {
    return this._tail;
  }

  private _eventsFor(
    batch: ServerSTTEvalBatchRequest,
    report: ServerSTTEvalReport | undefined,
  ): ServerSTTEvalLangfuseEvent[] {
    const now = new Date().toISOString();
    const traceId = idFor("trace", batch.call_id);
    const env = this._config.environment
      ? { environment: this._config.environment }
      : {};
    const event = (
      type: ServerSTTEvalLangfuseEvent["type"],
      body: Record<string, unknown>,
    ): ServerSTTEvalLangfuseEvent => ({
      id: randomUUID(),
      timestamp: now,
      type,
      body: { ...body, ...env },
    });
    const events: ServerSTTEvalLangfuseEvent[] = [
      event("trace-create", {
        id: traceId,
        name: "stt-eval",
        sessionId: batch.call_id,
        tags: ["stt-eval", batch.models.primary, batch.models.shadow],
        metadata: {
          call_id: batch.call_id,
          room: batch.room ?? null,
          models: batch.models,
          final: report?.final ?? batch.final === true,
          batches: report?.batches,
          segments: report?.segments,
          speakers: report?.speakers,
        },
      }),
    ];
    for (const segment of batch.segments) {
      const start = segment.start_time ?? segment.received_at;
      events.push(
        event("event-create", {
          id: idFor("segment", `${batch.call_id}\u0000${segment.id}`),
          traceId,
          name: `${segment.source}:${segment.participant_name || segment.participant_identity}`,
          startTime: isoFromSeconds(start),
          output: segment.text,
          metadata: {
            segment_id: segment.id,
            source: segment.source,
            model: segment.model,
            participant_identity: segment.participant_identity,
            participant_name: segment.participant_name ?? null,
            language: segment.language ?? null,
            start_time: segment.start_time ?? null,
            end_time: segment.end_time ?? null,
            received_at: segment.received_at,
          },
        }),
      );
    }
    if (report) {
      const score = (
        key: string,
        name: string,
        value: number | null,
        extra: Record<string, unknown> = {},
      ): void => {
        if (value === null) {
          return;
        }
        events.push(
          event("score-create", {
            id: idFor("score", `${batch.call_id}\u0000${key}`),
            traceId,
            name,
            value,
            dataType: "NUMERIC",
            ...extra,
          }),
        );
      };
      score("overall", "stt_disagreement", report.overall.disagreement);
      score(
        "overall-phonetic",
        "stt_phonetic_disagreement",
        report.overall.phonetic_disagreement,
      );
      for (const speaker of report.speakers_compared) {
        const who = {
          comment: speaker.participant_name,
          metadata: {
            participant_identity: speaker.participant_identity,
            primary: speaker.primary,
            shadow: speaker.shadow,
            method: speaker.method,
          },
        };
        score(
          `speaker\u0000${speaker.participant_identity}`,
          "stt_speaker_disagreement",
          speaker.disagreement,
          who,
        );
        score(
          `speaker-phonetic\u0000${speaker.participant_identity}`,
          "stt_speaker_phonetic_disagreement",
          speaker.phonetic_disagreement,
          who,
        );
      }
    }
    return events;
  }

  private async _send(
    callId: string,
    events: ServerSTTEvalLangfuseEvent[],
  ): Promise<void> {
    const auth = Buffer.from(
      `${this._config.publicKey}:${this._config.secretKey}`,
    ).toString("base64");
    for (let i = 0; i < events.length; i += EVENTS_PER_REQUEST) {
      try {
        const response = await fetch(
          `${this._config.baseUrl}/api/public/ingestion`,
          {
            method: "POST",
            headers: {
              authorization: `Basic ${auth}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              batch: events.slice(i, i + EVENTS_PER_REQUEST),
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );
        // 207 carries per-event results; anything in `errors` was refused.
        const result = (await response.json().catch(() => ({}))) as {
          errors?: unknown[];
        };
        const refused = Array.isArray(result.errors) ? result.errors.length : 0;
        if (!response.ok || refused > 0) {
          logger.warn("[stt-eval] Langfuse export incomplete", {
            callId,
            status: response.status,
            refused,
          });
        }
      } catch (error) {
        logger.warn("[stt-eval] Langfuse export failed", {
          callId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

/** A stable 32-hex id, so a resend upserts the same Langfuse object. */
function idFor(kind: string, key: string): string {
  return createHash("sha256")
    .update(`${kind}\u0000${key}`)
    .digest("hex")
    .slice(0, 32);
}

function isoFromSeconds(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}
