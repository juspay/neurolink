/**
 * Exhaustiveness enforcement for the translation IR.
 *
 * A translation layer fails quietly: an unhandled content part or event variant
 * becomes a missing tool call, and the only symptom is the next hop rejecting a
 * request nobody can explain. `assertProxyIRExhaustive` makes that a compile
 * error instead. Passing a value whose type is not `never` does not type-check,
 * so a new IR variant breaks every `switch` that has not handled it.
 *
 * It throws at runtime as well, because the compile-time guarantee only holds for
 * values that really are typed. A wire payload narrowed from `unknown` can reach a
 * default branch at runtime, and failing loudly there beats translating a request
 * with a silently dropped element.
 */

import type {
  ProxyIRContentPart,
  ProxyIRResponseEvent,
  ProxyIRTerminalOutcome,
  ProxyIRUnmappableValue,
} from "../types/index.js";

/**
 * Refuse an unhandled IR variant.
 *
 * `context` names the switch that failed, since the value alone rarely says which
 * of several exhaustive switches over the same union let it through.
 */
export function assertProxyIRExhaustive(value: never, context: string): never {
  throw new Error(
    `[proxy-ir] ${context} did not handle variant: ${describeProxyIRVariant(value)}`,
  );
}

/**
 * Describe a value for the exhaustiveness error without assuming its shape.
 *
 * The parameter is `never` at the call site, so nothing about it can be trusted
 * here: it may be a primitive, or an object with no discriminant at all — and an
 * untagged object is exactly the shape a malformed wire payload takes. Reviewed
 * finding (PR #1826): serializing that object's fields defeated the point of a
 * log/span-safe diagnostic, since the object can carry the same text or tool
 * arguments the typed describers deliberately withhold. The fallback is now a
 * fixed, shape-only marker — never the object's own content — for every
 * untagged case, not only the ones this file happens to call today.
 */
function describeProxyIRVariant(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return String(value);
  }
  const record: Record<string, unknown> = value as Record<string, unknown>;
  for (const discriminant of ["kind", "status", "source", "format"]) {
    const tag = record[discriminant];
    if (typeof tag === "string") {
      return `${discriminant}=${tag}`;
    }
  }
  return "[object without recognized discriminant]";
}

/** Mark a wire value no codec could represent, preserving it for the caller. */
export function proxyIRUnmappable(
  sourceKind: string,
  reason: string,
  raw: unknown,
): ProxyIRUnmappableValue {
  return { proxyIRUnmappable: true, sourceKind, reason, raw };
}

/** Narrow a collected codec result to the unmappable marker. */
export function isProxyIRUnmappable(
  value: unknown,
): value is ProxyIRUnmappableValue {
  return (
    value !== null &&
    typeof value === "object" &&
    (value as Record<string, unknown>).proxyIRUnmappable === true
  );
}

/**
 * Name a content part for a diagnostic.
 *
 * This lives in `src` rather than in the suite that asserts on it because
 * `tsconfig.json` excludes `test`: an exhaustive switch written only in a test
 * gives no compile-time guarantee at all. These describers are the shipped
 * consumers that pin every union, so adding an IR variant fails `tsc --noEmit`
 * here before it can reach a codec that silently drops it.
 *
 * Deliberately excludes the payload of text, thinking and tool arguments: a
 * describer's output reaches logs and span attributes, and prompt content does
 * not belong there.
 */
export function describeProxyIRPart(part: ProxyIRContentPart): string {
  switch (part.kind) {
    case "text":
      return `text(${part.text.length}b)`;
    case "thinking":
      return `thinking(${part.text.length}b)`;
    case "image":
      return `image(${part.encoding})`;
    case "tool_call":
      return `tool_call(${part.toolName})`;
    case "tool_result":
      return `tool_result(${part.content.length} parts${part.isError ? ", error" : ""})`;
    case "unmapped":
      return `unmapped(${part.sourceKind}: ${part.reason})`;
    default:
      return assertProxyIRExhaustive(part, "describeProxyIRPart");
  }
}

/** Name a stream event for a diagnostic, without its payload. */
export function describeProxyIRResponseEvent(
  event: ProxyIRResponseEvent,
): string {
  switch (event.kind) {
    case "text_delta":
      return `text_delta(${event.text.length}b)`;
    case "thinking_delta":
      return `thinking_delta(${event.text.length}b)`;
    case "tool_call_start":
      return `tool_call_start(${event.toolName})`;
    case "tool_call_arguments_delta":
      return `tool_call_arguments_delta(${event.partialArguments.length}b)`;
    case "tool_call_done":
      return "tool_call_done";
    case "item_done":
      return "item_done";
    case "usage":
      return "usage";
    case "terminal":
      return `terminal(${describeProxyIRTerminalOutcome(event.outcome)})`;
    default:
      return assertProxyIRExhaustive(event, "describeProxyIRResponseEvent");
  }
}

/** Name a terminal outcome, keeping an unmodelled upstream stop reason visible. */
export function describeProxyIRTerminalOutcome(
  outcome: ProxyIRTerminalOutcome,
): string {
  switch (outcome.status) {
    case "completed":
      return outcome.finishReason === "other"
        ? `completed:${outcome.rawFinishReason}`
        : `completed:${outcome.finishReason}`;
    case "failed":
      return `failed:${outcome.error.code}`;
    case "incomplete":
      return `incomplete:${outcome.reason}`;
    default:
      return assertProxyIRExhaustive(outcome, "describeProxyIRTerminalOutcome");
  }
}
