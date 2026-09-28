/**
 * Classification of a tool result that the loop received as a normal return
 * but that reports a failure in-band.
 *
 * `neurolink.executeTool` converts a thrown error and a circuit-breaker
 * refusal into `{ isError: true, content: [...] }`, MCP servers return the
 * same shape for a failed call, and the documented custom-tool pattern is
 * `return { error: "User not found" }`. Every consumer that decides "did this
 * tool succeed" — the `tool:end` event, the stored `tool_result` row, the
 * replayed marker, and `toolExecutions[].isError` — has to read those shapes
 * the same way, so the rule lives in ONE predicate, `isErrorShapedToolResult`,
 * and this module only extracts the text to report for it.
 */

import { isErrorShapedToolResult } from "../core/toolExecutionRecorder.js";

const ISERROR_FALLBACK_TEXT = "Tool returned isError: true";
const ERROR_SHAPE_FALLBACK_TEXT = "Tool reported an error";

/**
 * The error text carried by an error-shaped result (`isError: true`, an
 * `error` field, or a failing `status`), or undefined when the value is not
 * one. Prefers an `error` string, then a serialized non-string `error`, then
 * the joined text parts of an MCP `content` array, then a fixed fallback.
 */
export function extractIsErrorText(output: unknown): string | undefined {
  if (!isErrorShapedToolResult(output)) {
    return undefined;
  }
  const record = output as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.length > 0) {
    return record.error;
  }
  if (record.error !== undefined && record.error !== null) {
    try {
      return JSON.stringify(record.error) ?? String(record.error);
    } catch {
      return String(record.error);
    }
  }
  if (Array.isArray(record.content)) {
    const texts = (record.content as Array<{ type?: string; text?: string }>)
      .filter((c) => c && c.type === "text" && typeof c.text === "string")
      .map((c) => c.text as string);
    if (texts.length > 0) {
      return texts.join(" ");
    }
  }
  return record.isError === true
    ? ISERROR_FALLBACK_TEXT
    : ERROR_SHAPE_FALLBACK_TEXT;
}

/**
 * Same classification for a serialized result: the memory stores keep
 * `tool_result.content` as a JSON string, so a row written before the store
 * learned to flag error shapes can still be recognised at replay.
 */
export function extractIsErrorTextFromContent(
  content: unknown,
): string | undefined {
  if (typeof content !== "string") {
    return extractIsErrorText(content);
  }
  const trimmed = content.trim();
  if (
    !trimmed.startsWith("{") ||
    !(
      trimmed.includes('"isError"') ||
      trimmed.includes('"error"') ||
      trimmed.includes('"status"')
    )
  ) {
    return undefined;
  }
  try {
    return extractIsErrorText(JSON.parse(trimmed));
  } catch {
    return undefined;
  }
}
