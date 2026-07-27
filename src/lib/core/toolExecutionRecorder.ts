/**
 * ToolExecutionRecorder — real per-call tool execution capture.
 *
 * One recorder is created per generate()/stream() call and attached to the
 * request options (surviving option spreads). Tools are wrapped exactly once
 * at the central tool-assembly points (BaseProvider.prepareGenerationContext /
 * getToolsForStream), so every loop — the AI-SDK loop and the native
 * Gemini/Anthropic loops alike — records through the same wrapper with real
 * params, timing, and error status. Memory is bounded: serialized results are
 * capped at `maxResultChars` and the record list at `maxRecords`.
 */

import type {
  Tool,
  ToolExecutionCaptureOptions,
  ToolExecutionRecord,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

/** Default cap on serialized result characters kept per record (~8KB). */
export const DEFAULT_TOOL_RESULT_CAPTURE_CHARS = 8192;
/** Default cap on records kept per turn. */
export const DEFAULT_TOOL_EXECUTION_MAX_RECORDS = 500;

/** Marker set on execute functions the recorder has already wrapped. */
const RECORDER_WRAPPED = Symbol.for("neurolink.toolExecutionRecorder.wrapped");

/** Internal options key the per-call recorder rides on (enumerable so it survives option spreads). */
const RECORDER_OPTIONS_KEY = "toolExecutionRecorder";

/**
 * Serialize a tool result to bounded text. JSON when serializable, else
 * String(); truncation is explicit so consumers know the text is partial.
 */
export function serializeToolResult(result: unknown, maxChars: number): string {
  let text: string;
  if (typeof result === "string") {
    text = result;
  } else {
    try {
      text = JSON.stringify(result) ?? String(result);
    } catch {
      text = String(result);
    }
  }
  if (text.length > maxChars) {
    const dropped = text.length - maxChars;
    text = `${text.slice(0, maxChars)}…[truncated ${dropped} chars]`;
  }
  return text;
}

/**
 * Error-shaped tool results (MCP `isError`, `{error}` payloads) count as
 * failures even though the loop received them as normal returns.
 */
export function isErrorShapedToolResult(result: unknown): boolean {
  if (!result || typeof result !== "object") {
    return false;
  }
  const record = result as Record<string, unknown>;
  if (record.isError === true) {
    return true;
  }
  if (record.error !== undefined && record.error !== null) {
    return true;
  }
  if (typeof record.status === "string") {
    return ["error", "failed", "failure", "fail"].includes(
      record.status.toLowerCase().trim(),
    );
  }
  return false;
}

/**
 * Per-call recorder for tool executions. See module doc.
 */
export class ToolExecutionRecorder {
  // ES #private fields on purpose: the recorder rides on request options as
  // an ENUMERABLE property (spread survival), so TS-only `private` fields
  // would still be dragged into any JSON.stringify(options) — up to
  // maxRecords × maxResultChars of tool results in a debug dump. #fields are
  // invisible to serialization: the recorder stringifies as `{}`.
  readonly #maxResultChars: number;
  readonly #maxRecords: number;
  readonly #onRecord?: (record: ToolExecutionRecord) => void | Promise<void>;
  #records: ToolExecutionRecord[] = [];
  #droppedRecords = 0;

  constructor(capture?: ToolExecutionCaptureOptions) {
    this.#maxResultChars =
      capture?.maxResultChars ?? DEFAULT_TOOL_RESULT_CAPTURE_CHARS;
    this.#maxRecords =
      capture?.maxRecords ?? DEFAULT_TOOL_EXECUTION_MAX_RECORDS;
    this.#onRecord = capture?.onRecord;
  }

  /** Record one completed (or failed) execution. Never throws. */
  record(entry: {
    toolName: string;
    params: unknown;
    result?: unknown;
    error?: unknown;
    startedAt: number;
    durationMs: number;
  }): void {
    try {
      const failed = entry.error !== undefined;
      const record: ToolExecutionRecord = {
        toolName: entry.toolName,
        params: entry.params,
        resultText: serializeToolResult(
          failed
            ? entry.error instanceof Error
              ? entry.error.message
              : entry.error
            : entry.result,
          this.#maxResultChars,
        ),
        isError: failed || isErrorShapedToolResult(entry.result),
        startedAt: entry.startedAt,
        durationMs: entry.durationMs,
      };
      this.#records.push(record);
      if (this.#records.length > this.#maxRecords) {
        this.#records.splice(0, this.#records.length - this.#maxRecords);
        this.#droppedRecords++;
      }
      if (this.#onRecord) {
        try {
          // Swallow async rejections too — the contract is that listener
          // errors (sync OR async) never disrupt the turn.
          void Promise.resolve(this.#onRecord(record)).catch(() => {
            // Listener errors never break the run.
          });
        } catch {
          // Listener errors never break the run.
        }
      }
    } catch (recordError) {
      logger.debug("[ToolExecutionRecorder] Failed to record execution", {
        error:
          recordError instanceof Error
            ? recordError.message
            : String(recordError),
      });
    }
  }

  /** All records captured so far (oldest first, bounded by maxRecords). */
  getRecords(): ToolExecutionRecord[] {
    return [...this.#records];
  }

  /** True when at least one execution was recorded. */
  hasRecords(): boolean {
    return this.#records.length > 0;
  }

  /** Number of records evicted by the maxRecords cap. */
  getDroppedCount(): number {
    return this.#droppedRecords;
  }

  /**
   * Wrap every executable tool so its invocations are recorded. Wrapping is
   * idempotent — already-wrapped executes are left untouched, so a generate
   * that falls back to another path never double-records.
   */
  wrapTools(tools: Record<string, Tool>): Record<string, Tool> {
    // Null prototype: a tool named "__proto__" must stay an own entry
    // (mirrors BaseProvider.sortToolRecord / toolDiscovery partitioning).
    const wrapped: Record<string, Tool> = Object.create(null) as Record<
      string,
      Tool
    >;
    for (const [name, tool] of Object.entries(tools)) {
      const execute = (
        tool as {
          execute?: (
            params: unknown,
            execOptions?: unknown,
          ) => Promise<unknown>;
        }
      ).execute;
      if (
        typeof execute !== "function" ||
        (execute as unknown as Record<symbol, unknown>)[RECORDER_WRAPPED]
      ) {
        wrapped[name] = tool;
        continue;
      }
      const recorder = this;
      const recordingExecute = async (
        params: unknown,
        execOptions?: unknown,
      ): Promise<unknown> => {
        const startedAt = Date.now();
        try {
          const result = await execute(params, execOptions);
          recorder.record({
            toolName: name,
            params,
            result,
            startedAt,
            durationMs: Date.now() - startedAt,
          });
          return result;
        } catch (error) {
          recorder.record({
            toolName: name,
            params,
            error,
            startedAt,
            durationMs: Date.now() - startedAt,
          });
          throw error;
        }
      };
      (recordingExecute as unknown as Record<symbol, unknown>)[
        RECORDER_WRAPPED
      ] = true;
      wrapped[name] = { ...tool, execute: recordingExecute } as Tool;
    }
    return wrapped;
  }

  /**
   * Attach this recorder to a request options object. The property is
   * enumerable on purpose: downstream stages spread options (`{...options}`)
   * and the recorder must survive into the provider loops.
   */
  attachTo(options: Record<string, unknown>): void {
    options[RECORDER_OPTIONS_KEY] = this;
  }

  /** Retrieve the recorder a request is carrying, if any. */
  static from(options: unknown): ToolExecutionRecorder | undefined {
    if (!options || typeof options !== "object") {
      return undefined;
    }
    const candidate = (options as Record<string, unknown>)[
      RECORDER_OPTIONS_KEY
    ];
    return candidate instanceof ToolExecutionRecorder ? candidate : undefined;
  }
}

/**
 * Convert legacy loop-local `{name, input, output}` entries (plus optional
 * timing/error fields) into `ToolExecutionRecord`s. Used as the fallback when
 * a path produced executions the recorder did not see (e.g. results captured
 * before the recorder existed, or breaker/not-found entries that never
 * reached a real execute()).
 */
export function toToolExecutionRecords(
  legacyExecutions: unknown[] | undefined,
  capture?: ToolExecutionCaptureOptions,
): ToolExecutionRecord[] {
  if (!legacyExecutions || !Array.isArray(legacyExecutions)) {
    return [];
  }
  const maxChars = capture?.maxResultChars ?? DEFAULT_TOOL_RESULT_CAPTURE_CHARS;
  const maxRecords = capture?.maxRecords ?? DEFAULT_TOOL_EXECUTION_MAX_RECORDS;
  return legacyExecutions.slice(-maxRecords).map((entry, index) => {
    const record = (entry ?? {}) as Record<string, unknown>;
    // A canonical record round-tripping through this converter keeps its
    // already-serialized resultText verbatim instead of re-serializing an
    // absent `output` into the string "undefined".
    const output =
      record.output ??
      record.result ??
      record.response ??
      (typeof record.resultText === "string" ? record.resultText : undefined);
    const durationMs =
      typeof record.durationMs === "number"
        ? record.durationMs
        : typeof record.duration === "number"
          ? record.duration
          : typeof record.executionTime === "number"
            ? record.executionTime
            : 0;
    return {
      toolName:
        (record.name as string) ||
        (record.toolName as string) ||
        `tool_execution_${index}`,
      params: record.input ?? record.params ?? record.args ?? {},
      resultText: serializeToolResult(output, maxChars),
      isError:
        record.isError === true ||
        record.success === false ||
        record.error !== undefined ||
        isErrorShapedToolResult(output),
      startedAt: typeof record.startedAt === "number" ? record.startedAt : 0,
      durationMs,
    };
  });
}

/**
 * Resolve the toolExecutions for a result: recorder records when the request
 * carried a recorder that saw executions, else a conversion of the loop's
 * legacy accumulator entries.
 */
export function resolveToolExecutionRecords(
  options: unknown,
  legacyExecutions?: unknown[],
): ToolExecutionRecord[] {
  const recorder = ToolExecutionRecorder.from(options);
  if (recorder?.hasRecords()) {
    return recorder.getRecords();
  }
  const capture =
    options && typeof options === "object"
      ? (options as { toolExecutionCapture?: ToolExecutionCaptureOptions })
          .toolExecutionCapture
      : undefined;
  return toToolExecutionRecords(legacyExecutions, capture);
}
