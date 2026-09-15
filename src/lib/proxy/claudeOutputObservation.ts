import type { RequestLogEntry, SSETelemetry } from "../types/index.js";

/** Content visible to the caller; thinking and empty text are not useful output. */
export function hasUsefulClaudeContent(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  const block = value as Record<string, unknown>;
  if (Array.isArray(block.content)) {
    return block.content.some(hasUsefulClaudeContent);
  }
  if (block.type === "thinking" || block.type === "redacted_thinking") {
    return false;
  }
  if (typeof block.text === "string" && block.text.trim().length > 0) {
    return true;
  }
  if (typeof block.refusal === "string" && block.refusal.trim().length > 0) {
    return true;
  }
  return (
    (block.type === "tool_use" || block.type === "server_tool_use") &&
    typeof block.name === "string" &&
    block.name.length > 0 &&
    block.input !== undefined
  );
}

/** A complete JSON response becomes observable when its body has been read. */
export function observeClaudeJsonOutput(
  metadata: Record<string, unknown>,
  value: unknown,
  at = Date.now(),
): void {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as Record<string, unknown>).content)
  ) {
    metadata.firstUsefulOutputStatus = "not_observed";
    metadata.firstUsefulOutputUnavailableReason = "unrecognized_response";
    return;
  }
  if (hasUsefulClaudeContent(value)) {
    metadata.firstUsefulOutputAt = at;
    metadata.firstUsefulOutputStatus = "observed";
    metadata.firstUsefulOutputEvent = "json_response.content";
  } else {
    metadata.firstUsefulOutputStatus = "no_useful_output";
    delete metadata.firstUsefulOutputAt;
    delete metadata.firstUsefulOutputEvent;
  }
  delete metadata.firstUsefulOutputUnavailableReason;
}

/** Keep unavailable observations distinct from a complete stream with no output. */
export function observeClaudeStreamOutput(
  metadata: Record<string, unknown>,
  data: SSETelemetry,
): void {
  delete metadata.firstUsefulOutputAt;
  delete metadata.firstUsefulOutputEvent;
  delete metadata.firstUsefulOutputUnavailableReason;
  if (!data.observationIncomplete && data.firstUsefulOutputAt !== undefined) {
    metadata.firstUsefulOutputAt = data.firstUsefulOutputAt;
    metadata.firstUsefulOutputEvent = data.firstUsefulOutputEvent;
    metadata.firstUsefulOutputStatus = "observed";
  } else if (!data.observationIncomplete && data.messageStopReceived) {
    metadata.firstUsefulOutputStatus = "no_useful_output";
  } else {
    metadata.firstUsefulOutputStatus = "not_observed";
    metadata.firstUsefulOutputUnavailableReason = data.observationIncomplete
      ? "incomplete_observation"
      : "stream_incomplete";
  }
}

/** Final records always explain whether useful-output latency was observed. */
export function claudeOutputLogFields(
  metadata: Record<string, unknown>,
  requestStartTime: number,
): Pick<
  RequestLogEntry,
  | "firstUsefulOutputMs"
  | "firstUsefulOutputStatus"
  | "firstUsefulOutputEvent"
  | "firstUsefulOutputUnavailableReason"
> {
  const at = metadata.firstUsefulOutputAt;
  if (typeof at === "number" && Number.isFinite(at)) {
    return {
      firstUsefulOutputMs: Math.max(0, at - requestStartTime),
      firstUsefulOutputStatus: "observed",
      firstUsefulOutputEvent:
        typeof metadata.firstUsefulOutputEvent === "string"
          ? metadata.firstUsefulOutputEvent
          : "translated_output",
    };
  }
  return metadata.firstUsefulOutputStatus === "no_useful_output"
    ? { firstUsefulOutputStatus: "no_useful_output" }
    : {
        firstUsefulOutputStatus: "not_observed",
        firstUsefulOutputUnavailableReason:
          typeof metadata.firstUsefulOutputUnavailableReason === "string"
            ? metadata.firstUsefulOutputUnavailableReason
            : "response_not_observed",
      };
}
