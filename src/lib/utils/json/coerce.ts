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
  ValidationSchema,
} from "../../types/index.js";
import { logger } from "../logger.js";
import { nextBalancedJsonSpan } from "./extract.js";

/** True when the schema exposes a Zod-style `safeParse` we can validate with. */
function hasSafeParse(schema: ValidationSchema): boolean {
  return typeof (schema as { safeParse?: unknown }).safeParse === "function";
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
  // `truncated` marks the first-open-to-end candidate: it is only reachable
  // when no balanced span and no first-to-last span matched, i.e. there was no
  // closing bracket at all — the signature of token-truncated output.
  const candidates: Array<{ text: string; truncated: boolean }> = [];
  let searchFrom = 0;
  for (;;) {
    const found = nextBalancedJsonSpan(text, searchFrom);
    if (!found) {
      break;
    }
    candidates.push({ text: found.span, truncated: false });
    searchFrom = found.end;
  }
  const openIndexes = [text.indexOf("{"), text.indexOf("[")].filter(
    (i) => i >= 0,
  );
  const firstOpen = openIndexes.length > 0 ? Math.min(...openIndexes) : -1;
  const lastClose = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (firstOpen >= 0 && lastClose > firstOpen) {
    candidates.push({
      text: text.slice(firstOpen, lastClose + 1),
      truncated: false,
    });
  }
  if (firstOpen >= 0) {
    candidates.push({ text: text.slice(firstOpen), truncated: true });
  }

  let firstValid:
    | { value: unknown; repaired: boolean; truncated: boolean }
    | undefined;
  let schemaMatch:
    | { value: unknown; repaired: boolean; truncated: boolean }
    | undefined;
  const seen = new Set<string>();
  for (const candidate of candidates) {
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
    };
    if (firstValid === undefined) {
      firstValid = record;
    }
    if (schema && hasSafeParse(schema)) {
      const safeParseable = schema as {
        safeParse: (v: unknown) => { success: boolean };
      };
      if (safeParseable.safeParse(outcome.value).success) {
        schemaMatch = record;
        break;
      }
    } else {
      // No Zod schema to discriminate — first parseable object wins.
      break;
    }
  }

  const chosen = schemaMatch ?? firstValid;
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
