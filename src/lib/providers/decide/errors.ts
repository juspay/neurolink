import type {
  DecideBodyShape,
  DecideErrorRule,
  DecideErrors,
  DecisionError,
  DecisionErrorKind,
} from "../../types/index.js";
import { redactCredentials } from "../systemOneDecision.js";
import { DECIDE_FORMATTERS } from "./formatters.js";
import { readPath } from "./paths.js";

const RETRYABLE_BY_DEFAULT: ReadonlySet<DecisionErrorKind> = new Set([
  "rate_limit",
  "overloaded",
  "server",
]);

const isRetryableByDefault = (kind: DecisionErrorKind): boolean =>
  RETRYABLE_BY_DEFAULT.has(kind);

function ruleMatches(rule: DecideErrorRule, status: number): boolean {
  const statuses: readonly number[] =
    rule.status === undefined
      ? []
      : typeof rule.status === "number"
        ? [rule.status]
        : rule.status;
  return (
    statuses.includes(status) ||
    (rule.statusMin !== undefined && status >= rule.statusMin)
  );
}

function messageFromShape(
  shape: DecideBodyShape,
  value: unknown,
): string | undefined {
  if (shape.isArray) {
    return Array.isArray(value) && shape.formatter
      ? DECIDE_FORMATTERS[shape.formatter](value)
      : undefined;
  }
  if (typeof value !== "string" || value.length === 0) {
    return undefined;
  }
  return shape.formatter ? DECIDE_FORMATTERS[shape.formatter](value) : value;
}

export function classifyDecisionError(
  spec: DecideErrors,
  input: {
    status: number;
    payload: unknown;
    requestId: string | undefined;
    label: string;
    apiKey: string;
  },
): DecisionError {
  const { status, payload, requestId, label, apiKey } = input;
  const rule = spec.rules.find((candidate) => ruleMatches(candidate, status));
  const ruleKind = rule?.kind ?? spec.default;
  const ruleRetryable = rule?.retryable ?? isRetryableByDefault(ruleKind);
  // Redacted once, here: it stands in for a shape's text that redaction
  // empties, and the label is catalog data a key can match. Redaction is not
  // idempotent for a key such as "e" (it matches inside "[redacted]"), so the
  // fallback is never passed through it a second time.
  const fallback = redactCredentials(
    `${label} request failed with HTTP ${status}`,
    apiKey,
  );
  const build = (
    kind: DecisionErrorKind,
    retryable: boolean,
    text?: string,
  ): DecisionError => ({
    kind,
    message: (text && redactCredentials(text, apiKey)) || fallback,
    status,
    requestId,
    retryable,
  });

  for (const shape of spec.bodyShapes) {
    const text = messageFromShape(shape, readPath(payload, shape.path));
    if (text !== undefined) {
      return build(
        shape.kind ?? ruleKind,
        shape.retryable ??
          (shape.kind === undefined
            ? ruleRetryable
            : isRetryableByDefault(shape.kind)),
        text,
      );
    }
  }
  return build(ruleKind, ruleRetryable);
}
