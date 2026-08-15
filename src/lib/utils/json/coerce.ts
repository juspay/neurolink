/**
 * Coerce arbitrary model text into canonical, syntactically-valid JSON.
 *
 * Used on the text-mode path (providers/models that could not use AI-SDK
 * structured output, e.g. real Gemini + tools). The model hand-writes JSON and
 * frequently mis-escapes the content field (bare newline, unescaped quote,
 * invalid escape like \d). A balanced-brace scan finds the object span; if
 * JSON.parse rejects it, jsonrepair fixes common escaping mistakes; the result
 * is re-serialised with JSON.stringify so downstream consumers always receive
 * valid JSON.
 *
 * NOTE: jsonrepair is a heuristic. On content where a lone backslash is
 * meaningful (regex/script/Windows path) it may drop the backslash, producing
 * valid-but-semantically-altered content. This only affects the residual
 * text-mode path — the primary Vertex+Claude path uses experimental_output and
 * never reaches here. When jsonrepair changes the input we log at debug level
 * so the event is observable.
 */
import { jsonrepair } from "jsonrepair";
import type {
  JsonCoercionResult,
  ScalarRecoveryDecision,
  ValidationSchema,
} from "../../types/index.js";
import { logger } from "../logger.js";
import { nextBalancedJsonSpan } from "./extract.js";

/** True when the schema exposes a Zod-style `safeParse` we can validate with. */
function hasSafeParse(schema: ValidationSchema): boolean {
  return typeof (schema as { safeParse?: unknown }).safeParse === "function";
}

/**
 * Does `value` satisfy `schema`? A schema we cannot validate with (absent, or
 * without a Zod-style `safeParse`) accepts everything — callers use this as a
 * gate, not as proof, so an unknown schema must never block a value.
 *
 * Exists so the consumers of coerceJsonToSchema can refuse to publish a
 * recovered value as `structuredData` when the caller's schema rejects it —
 * e.g. a raw *string* under an object schema, which is the shape a truncated
 * response degrades to.
 */
export function schemaAccepts(
  schema: ValidationSchema | undefined,
  value: unknown,
): boolean {
  if (!schema || !hasSafeParse(schema)) {
    return true;
  }
  return (
    schema as { safeParse: (v: unknown) => { success: boolean } }
  ).safeParse(value).success;
}

/**
 * Recover a JSON *scalar* root (string/number/boolean) from model text. The
 * object/array case is handled by `coerceJsonToSchema`; this covers the
 * residual scalar root after that path returns null. Encapsulates the JSON
 * parsing, the empty-string normalization, and the `schemaAccepts` gate so the
 * same policy cannot drift between consumers (`neurolink.recoverStructuredData`
 * and `GenerationHandler.coerceTextMode`).
 */
export function recoverScalarRoot(
  text: string,
  schema: ValidationSchema | undefined,
): ScalarRecoveryDecision {
  try {
    const scalar: unknown = JSON.parse(text);
    if (scalar === "") {
      return { kind: "empty" };
    }
    if (scalar === null || scalar === undefined) {
      return { kind: "nullish" };
    }
    if (schemaAccepts(schema, scalar)) {
      return { kind: "accepted", value: scalar };
    }
    return { kind: "rejected", value: scalar };
  } catch {
    return { kind: "not-json" };
  }
}

/**
 * Parse `candidate` as JSON, repairing common escaping mistakes on failure.
 * Returns the parsed value plus whether jsonrepair had to alter the text.
 */
function parseOrRepair(
  candidate: string,
): { value: unknown; repaired: boolean } | undefined {
  try {
    return { value: JSON.parse(candidate), repaired: false };
  } catch {
    // fall through to repair
  }
  try {
    const repaired = jsonrepair(candidate);
    const value = JSON.parse(repaired);
    if (repaired !== candidate && logger.shouldLog("debug")) {
      logger.debug("[coerceJsonToSchema] jsonrepair altered model output", {
        originalLength: candidate.length,
        repairedLength: repaired.length,
      });
    }
    return { value, repaired: repaired !== candidate };
  } catch {
    return undefined;
  }
}

/** Bounds the recursive nested-string unwrap against pathological inputs. */
const MAX_NESTED_UNWRAP_DEPTH = 6;

/** Bounds the structural back-off when salvaging a truncated root object. */
const MAX_SALVAGE_TRIMS = 8;

/**
 * Last-resort recovery for output cut off mid-JSON: walk the unclosed root span
 * backwards to successively earlier structural boundaries (`,` / `}` / `]`) and
 * re-attempt parse+repair at each one. Truncation can land somewhere jsonrepair
 * cannot close on its own (inside an escape, a half-written key, a dangling
 * separator); dropping back to the last completed field gives it a repairable
 * prefix. Returns a PARTIAL object — the fields the model did finish — so a
 * truncated response degrades to an incomplete object rather than to raw text.
 */
function salvageTruncatedRoot(span: string): unknown | undefined {
  let candidate = span;
  for (let i = 0; i < MAX_SALVAGE_TRIMS && candidate.length > 1; i++) {
    const cut = Math.max(
      candidate.lastIndexOf(","),
      candidate.lastIndexOf("}"),
      candidate.lastIndexOf("]"),
    );
    if (cut <= 0) {
      break;
    }
    candidate = candidate.slice(0, cut);
    const outcome = parseOrRepair(candidate);
    if (
      outcome !== undefined &&
      outcome.value !== null &&
      typeof outcome.value === "object"
    ) {
      return outcome.value;
    }
  }
  return undefined;
}

/**
 * Recursively replace any string-valued field whose content is itself a JSON
 * object/array with the parsed value. Models sometimes double-encode a NESTED
 * field — e.g. `{ "attachment": "{\"k\":1}" }` instead of
 * `{ "attachment": { "k": 1 } }` — which fails schema validation even though the
 * intended object is right there. (`coerceJsonToSchema` already unwraps a
 * stringified TOP-LEVEL object; this handles the nested case.)
 *
 * A parsed string is NOT re-descended into: its own string fields (e.g. an
 * attachment's `content`) are the model's intended values and must be left
 * alone. Recursion only walks already-structural objects/arrays to find
 * stringified fields anywhere in the tree. Returns a NEW value (never mutates
 * the input) plus whether anything changed, so the caller can skip a redundant
 * re-validation when nothing was unwrapped. Callers MUST re-validate the result
 * against the schema — that gate is what keeps an over-eager unwrap (a field
 * that should stay a string) from being accepted.
 */
function deepUnwrapJsonStrings(
  value: unknown,
  depth = 0,
): { value: unknown; changed: boolean } {
  if (depth > MAX_NESTED_UNWRAP_DEPTH) {
    return { value, changed: false };
  }
  if (typeof value === "string") {
    const s = value.trim();
    const looksJson =
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith("[") && s.endsWith("]"));
    if (looksJson) {
      try {
        const parsed: unknown = JSON.parse(s);
        if (parsed !== null && typeof parsed === "object") {
          // Parsed one stringified layer. Do NOT descend into `parsed` — its
          // own string fields are intended values, not double-encodings.
          return { value: parsed, changed: true };
        }
      } catch {
        // not JSON — leave the string as-is
      }
    }
    return { value, changed: false };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((item) => {
      const r = deepUnwrapJsonStrings(item, depth + 1);
      if (r.changed) {
        changed = true;
      }
      return r.value;
    });
    return { value: changed ? out : value, changed };
  }
  if (value !== null && typeof value === "object") {
    let changed = false;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const r = deepUnwrapJsonStrings(v, depth + 1);
      if (r.changed) {
        changed = true;
      }
      out[k] = r.value;
    }
    return { value: changed ? out : value, changed };
  }
  return { value, changed: false };
}

/**
 * Try to produce canonical JSON from `text`. Returns null when no JSON object
 * could be recovered (caller should then keep the raw text).
 *
 * When `schema` is a Zod schema, candidates that satisfy it are preferred; a
 * syntactically-valid-but-schema-failing object is still returned (we guarantee
 * JSON *validity*, leaving schema/content checks to the caller's own pipeline).
 */
export function coerceJsonToSchema(
  text: string,
  schema?: ValidationSchema,
): JsonCoercionResult | null {
  if (typeof text !== "string" || text.trim().length === 0) {
    return null;
  }

  // Ordered candidate substrings, best-formed first:
  //  1. every balanced object/array span (clean, common case)
  //  2. first "{" or "[" to last "}" or "]" (drops surrounding prose; lets
  //     jsonrepair fix escaping inside) — root ARRAYS matter for array schemas
  //  3. first "{" or "[" to end of text (TRUNCATED output —
  //     finishReason=length — where the closing bracket was cut off;
  //     jsonrepair closes it)
  // `truncated` marks a candidate that could only come from output cut short:
  // the first-open-to-end span, and — when the ROOT bracket never closes —
  // every other candidate too, since all of them are then partial views of an
  // unfinished document.
  //
  // `rootAligned` marks candidates that start at the document's first opening
  // bracket, i.e. at the real root. Candidates are ordered root-aligned FIRST.
  // On truncated output the root brace never balances, so the balanced scan
  // walks on and matches brackets that live INSIDE a string value (`[step 1]`
  // in a shell script, say) — a syntactically fine but semantically bogus
  // array. Preferring the root keeps the partial real object ahead of that.
  const candidates: Array<{
    text: string;
    truncated: boolean;
    rootAligned: boolean;
  }> = [];
  const openIndexes = [text.indexOf("{"), text.indexOf("[")].filter(
    (i) => i >= 0,
  );
  const firstOpen = openIndexes.length > 0 ? Math.min(...openIndexes) : -1;
  let rootClosed = false;
  let searchFrom = 0;
  for (;;) {
    const found = nextBalancedJsonSpan(text, searchFrom);
    if (!found) {
      break;
    }
    const start = found.end - found.span.length;
    if (start === firstOpen) {
      rootClosed = true;
    }
    candidates.push({
      text: found.span,
      truncated: false,
      rootAligned: start === firstOpen,
    });
    searchFrom = found.end;
  }
  // No balanced span starts at the root bracket → the document is unclosed.
  const rootUnclosed = firstOpen >= 0 && !rootClosed;
  const lastClose = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (firstOpen >= 0 && lastClose > firstOpen) {
    candidates.push({
      text: text.slice(firstOpen, lastClose + 1),
      truncated: rootUnclosed,
      rootAligned: true,
    });
  }
  if (firstOpen >= 0) {
    candidates.push({
      text: text.slice(firstOpen),
      truncated: true,
      rootAligned: true,
    });
  }

  // JSON-string-literal wrapper: some providers double-encode and return the
  // object as a JSON *string* (e.g. `"{\"k\":1}"`). Unwrap one layer and add
  // the inner text's balanced spans as candidates so the object is recovered.
  const literal = text.trim();
  if (literal.length > 1 && literal.startsWith('"') && literal.endsWith('"')) {
    try {
      const inner: unknown = JSON.parse(literal);
      if (typeof inner === "string") {
        let innerFrom = 0;
        for (;;) {
          const innerSpan = nextBalancedJsonSpan(inner, innerFrom);
          if (!innerSpan) {
            break;
          }
          candidates.push({
            text: innerSpan.span,
            truncated: false,
            rootAligned: false,
          });
          innerFrom = innerSpan.end;
        }
      }
    } catch {
      // not a string literal — ignore
    }
  }

  // Stable partition: root-aligned candidates first. Only the ORDER changes —
  // no candidate is dropped — so the multi-object "prefer the most complete
  // schema-valid candidate" selection below is unaffected (it is order
  // independent), while the unschema'd first-parseable-wins path and the
  // `firstValid` fallback now favour the document's real root.
  const ordered = [
    ...candidates.filter((c) => c.rootAligned),
    ...candidates.filter((c) => !c.rootAligned),
  ];

  let firstValid:
    | {
        value: unknown;
        repaired: boolean;
        truncated: boolean;
        rootAligned: boolean;
      }
    | undefined;
  const schemaValid: Array<{
    value: unknown;
    repaired: boolean;
    truncated: boolean;
    rootAligned: boolean;
  }> = [];
  const hasSchema = !!(schema && hasSafeParse(schema));
  const seen = new Set<string>();
  for (const candidate of ordered) {
    if (seen.has(candidate.text)) {
      continue;
    }
    seen.add(candidate.text);
    const outcome = parseOrRepair(candidate.text);
    if (
      outcome === undefined ||
      outcome.value === null ||
      typeof outcome.value !== "object"
    ) {
      continue;
    }
    const record = {
      value: outcome.value,
      repaired: outcome.repaired,
      truncated: candidate.truncated,
      rootAligned: candidate.rootAligned,
    };
    if (firstValid === undefined) {
      firstValid = record;
    }
    if (!hasSchema) {
      // No Zod schema to discriminate — first parseable object wins.
      break;
    }
    const safeParseable = schema as {
      safeParse: (v: unknown) => { success: boolean };
    };
    if (safeParseable.safeParse(outcome.value).success) {
      schemaValid.push(record);
    } else {
      // The model may have double-encoded a NESTED field as a JSON string
      // (e.g. `{"attachment":"{...}"}` instead of `{"attachment":{...}}`),
      // which fails validation even though the intended object is present.
      // Unwrap stringified object/array fields and re-validate before giving
      // up — the safeParse gate rejects any over-eager unwrap.
      const unwrapped = deepUnwrapJsonStrings(outcome.value);
      if (
        unwrapped.changed &&
        unwrapped.value !== null &&
        typeof unwrapped.value === "object" &&
        safeParseable.safeParse(unwrapped.value).success
      ) {
        schemaValid.push({
          value: unwrapped.value,
          repaired: true,
          truncated: candidate.truncated,
          rootAligned: candidate.rootAligned,
        });
      } else if (
        // Single-element array wrapper: for an OBJECT schema, models sometimes
        // return `[{...}]` instead of `{...}` (seen on the native Anthropic
        // path under escaping stress). Unwrap a lone object element and
        // re-validate — the safeParse gate rejects an incorrect unwrap, so an
        // array schema (which validates the array directly above) is untouched.
        Array.isArray(outcome.value) &&
        outcome.value.length === 1 &&
        outcome.value[0] !== null &&
        typeof outcome.value[0] === "object" &&
        !Array.isArray(outcome.value[0]) &&
        safeParseable.safeParse(outcome.value[0]).success
      ) {
        schemaValid.push({
          value: outcome.value[0],
          repaired: true,
          truncated: candidate.truncated,
          rootAligned: candidate.rootAligned,
        });
      }
    }
  }

  // Among schema-valid candidates prefer the MOST COMPLETE one. With nullable
  // fields a lean object (e.g. `{summary, attachment: null}`) validates
  // alongside the full object, so breaking on the first match would drop the
  // richer payload (the classic preamble-then-real-answer case). Pick the
  // candidate whose serialized form carries the most content.
  const schemaMatch =
    schemaValid.length > 0
      ? schemaValid.reduce((best, cur) =>
          JSON.stringify(cur.value).length > JSON.stringify(best.value).length
            ? cur
            : best,
        )
      : undefined;

  let chosen = schemaMatch ?? firstValid;
  // Salvage the root when the document is unclosed AND nothing trustworthy came
  // out of it: either nothing parsed at all, or the only parseable candidate is
  // a bracket pair scraped from INSIDE a string value (not root-aligned, not
  // schema-valid) — the `["step 1"]`-from-a-shell-script case. Backing off to
  // the last completed field yields a PARTIAL OBJECT flagged `truncated`,
  // instead of a bogus value or raw text degrading to a string.
  if (
    rootUnclosed &&
    schemaMatch === undefined &&
    (chosen === undefined || !chosen.rootAligned)
  ) {
    const salvaged = salvageTruncatedRoot(text.slice(firstOpen));
    if (salvaged !== undefined) {
      logger.debug("[coerceJsonToSchema] salvaged a partial truncated object", {
        textLength: text.length,
      });
      chosen = {
        value: salvaged,
        repaired: true,
        truncated: true,
        rootAligned: true,
      };
    } else if (chosen !== undefined) {
      // Nothing salvageable, but we still know the output was truncated —
      // never report a candidate scraped from a truncated document as complete.
      chosen = { ...chosen, truncated: true };
    }
  }
  if (chosen === undefined) {
    return null;
  }
  return {
    content: JSON.stringify(chosen.value),
    structuredData: chosen.value,
    repaired: chosen.repaired,
    truncated: chosen.truncated,
  };
}
