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

// The window a messagePattern is searched in: an error body can be arbitrarily
// long, and a pattern only needs the start of it.
const MESSAGE_MATCH_LIMIT = 2000;

const COMPILED_PATTERNS = new Map<string, RegExp>();

function compilePattern(source: string): RegExp {
  const cached = COMPILED_PATTERNS.get(source);
  if (cached) {
    return cached;
  }
  const compiled = new RegExp(source, "i");
  COMPILED_PATTERNS.set(source, compiled);
  return compiled;
}

function ruleMatches(
  rule: DecideErrorRule,
  status: number,
  message: string,
): boolean {
  const statuses: readonly number[] =
    rule.status === undefined
      ? []
      : typeof rule.status === "number"
        ? [rule.status]
        : rule.status;
  return (
    (statuses.includes(status) ||
      (rule.statusMin !== undefined && status >= rule.statusMin)) &&
    (rule.messagePattern === undefined ||
      compilePattern(rule.messagePattern).test(
        message.slice(0, MESSAGE_MATCH_LIMIT),
      ))
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

function firstShapeText(
  shapes: readonly DecideBodyShape[],
  payload: unknown,
): { shape: DecideBodyShape; text: string } | undefined {
  for (const shape of shapes) {
    const text = messageFromShape(shape, readPath(payload, shape.path));
    if (text !== undefined) {
      return { shape, text };
    }
  }
  return undefined;
}

export function classifyDecisionError(
  spec: DecideErrors,
  input: {
    status: number;
    payload: unknown;
    requestId: string | undefined;
    label: string;
    apiKey: string;
    apiKeyEnvVar?: string;
  },
): DecisionError {
  const { status, payload, requestId, label, apiKey, apiKeyEnvVar } = input;
  // Redacted once, here: it stands in for a shape's text that redaction
  // empties, and the label is catalog data a key can match. Redaction is not
  // idempotent for a key such as "e" (it matches inside "[redacted]"), so the
  // fallback is never passed through it a second time.
  const fallback = redactCredentials(
    `${label} request failed with HTTP ${status}`,
    apiKey,
  );
  const found = firstShapeText(spec.bodyShapes, payload);
  // The message comes first because a rule may match on it: the key is gone
  // from the text a pattern sees.
  const message =
    (found?.text && redactCredentials(found.text, apiKey)) || fallback;
  const rule = spec.rules.find((candidate) =>
    ruleMatches(candidate, status, message),
  );
  const ruleKind = rule?.kind ?? spec.default;
  const ruleRetryable = rule?.retryable ?? isRetryableByDefault(ruleKind);
  // Added after the rule is chosen, so a pattern never has to allow for it,
  // and redacted on its own, once, for the same reason as the fallback above.
  const hinted = rule?.hint
    ? `${message} — ${redactCredentials(
        rule.hint
          .split("{apiKeyEnvVar}")
          .join(apiKeyEnvVar ?? "the API key variable"),
        apiKey,
      )}`
    : message;
  const build = (
    kind: DecisionErrorKind,
    retryable: boolean,
  ): DecisionError => ({
    kind,
    message: hinted,
    status,
    requestId,
    retryable,
  });

  if (found) {
    const { shape } = found;
    return build(
      shape.kind ?? ruleKind,
      shape.retryable ??
        (shape.kind === undefined
          ? ruleRetryable
          : isRetryableByDefault(shape.kind)),
    );
  }
  return build(ruleKind, ruleRetryable);
}
