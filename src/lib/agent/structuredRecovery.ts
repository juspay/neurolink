/**
 * Structured-output recovery ladder for the isolated-agent runner.
 *
 * Ports the production-hardened pattern the framework's consumers built by
 * hand: candidates are tried in a fixed order — provider `structuredData` →
 * raw JSON object → ```json fence → first/last-brace span → top-level array —
 * each passed through the caller's `coerce` normalizer and validated against
 * the (lenient) local schema. The first schema-valid candidate wins;
 * validation errors are collected for corrective re-asks.
 */

import type { z } from "zod";
import type {
  StructuredRecoveryCandidate,
  StructuredRecoveryResult,
} from "../types/index.js";

function tryParse(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Collect parse candidates from model text (and provider structuredData) in
 * ladder order. Never throws.
 */
export function collectStructuredCandidates(
  content: string | undefined,
  structuredData?: unknown,
): StructuredRecoveryCandidate[] {
  const candidates: StructuredRecoveryCandidate[] = [];

  if (structuredData !== undefined && structuredData !== null) {
    candidates.push({ source: "structured-data", value: structuredData });
  }

  const text = (content ?? "").trim();
  if (!text) {
    return candidates;
  }

  // Raw JSON object/array/scalar
  const raw = tryParse(text);
  if (raw !== undefined) {
    candidates.push({ source: "raw-json", value: raw });
  }

  // ```json fenced block (first fence wins)
  const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/i);
  if (fenceMatch?.[1]) {
    const fenced = tryParse(fenceMatch[1].trim());
    if (fenced !== undefined) {
      candidates.push({ source: "json-fence", value: fenced });
    }
  }

  // First-brace .. last-brace span
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const span = tryParse(text.slice(firstBrace, lastBrace + 1));
    if (span !== undefined) {
      candidates.push({ source: "brace-span", value: span });
    }
  }

  // Top-level array span
  const firstBracket = text.indexOf("[");
  const lastBracket = text.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const arraySpan = tryParse(text.slice(firstBracket, lastBracket + 1));
    if (arraySpan !== undefined && Array.isArray(arraySpan)) {
      candidates.push({ source: "top-level-array", value: arraySpan });
    }
  }

  return candidates;
}

/**
 * Run the full ladder: candidates (through `coerce`) validated against
 * `schema`; first success wins. Never throws — coerce/validation failures
 * become entries in `errors`.
 */
export function recoverStructuredData(args: {
  content: string | undefined;
  structuredData?: unknown;
  schema: z.ZodSchema;
  coerce?: (candidate: unknown) => unknown;
}): StructuredRecoveryResult {
  const errors: string[] = [];
  const candidates = collectStructuredCandidates(
    args.content,
    args.structuredData,
  );

  for (const candidate of candidates) {
    let value = candidate.value;
    if (args.coerce) {
      try {
        value = args.coerce(value);
      } catch (coerceError) {
        errors.push(
          `${candidate.source}: coerce failed — ${
            coerceError instanceof Error
              ? coerceError.message
              : String(coerceError)
          }`,
        );
        continue;
      }
    }
    const parsed = args.schema.safeParse(value);
    if (parsed.success) {
      return { data: parsed.data, source: candidate.source, errors };
    }
    errors.push(`${candidate.source}: ${summarizeZodError(parsed.error)}`);
  }

  if (candidates.length === 0) {
    errors.push("no JSON-shaped candidates found in output");
  }
  return { errors };
}

/** Bounded, prompt-friendly summary of a Zod validation error. */
export function summarizeZodError(error: z.ZodError): string {
  const issues = error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
  const extra = error.issues.length > 5 ? ` (+${error.issues.length - 5})` : "";
  return issues.join("; ") + extra;
}
