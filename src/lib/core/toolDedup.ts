/**
 * Tool-signature deduplication — pure module, no I/O, no side effects.
 *
 * ## Algorithm
 *
 * `computeToolSignature` builds a canonical, order-insensitive string from:
 *   1. The tool's name (exact, case-preserved).
 *   2. A normalised description: lowercased, all whitespace runs collapsed to a
 *      single space, leading/trailing whitespace stripped.
 *   3. A sorted, deduplicated list of JSON-schema property names (top-level
 *      `properties` keys from `inputSchema`).  If the schema exposes a `type`
 *      field on each property, that type string is appended as `name:type`.
 *
 * `dedupeTools` clusters tools by pairwise token-set Jaccard similarity:
 *
 *   Jaccard(A, B) = |A ∩ B| / |A ∪ B|
 *
 * where A and B are the _sets_ of whitespace-split tokens from each tool's
 * canonical signature.  This is deterministic, symmetric, and independent of
 * token ordering — making it robust to minor rewording while being fast (O(n²)
 * in the number of tools, which is bounded in practice by provider limits).
 *
 * The first tool encountered in stable input-iteration order becomes the
 * cluster representative; subsequent tools in the same cluster are dropped.
 */

import type { Tool } from "../types/index.js";
import type { ToolDedupConfig, ToolDedupResult } from "../types/index.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Extract top-level property names (and optionally their types) from a JSON
 * Schema-shaped `inputSchema`.  Returns a sorted, stable list.
 *
 * The `inputSchema` on a `Tool` is typed as `FlexibleSchema<INPUT>` (opaque at
 * runtime), so we access it via index to avoid casting.
 */
function extractSchemaTokens(
  inputSchema: Tool["inputSchema"] | undefined,
): string[] {
  if (!inputSchema) {
    return [];
  }

  // FlexibleSchema may be a Zod schema, a jsonSchema() wrapper, or a plain
  // JSON Schema object.  All three expose `jsonSchema` or fall through to the
  // raw object.  We look for the plain JSON Schema `properties` key.
  const schema = inputSchema as Record<string, unknown>;

  // Vercel AI SDK wraps plain schemas in { jsonSchema: {...}, ... }
  const rawSchema =
    schema["jsonSchema"] !== undefined
      ? (schema["jsonSchema"] as Record<string, unknown>)
      : schema;

  const properties = rawSchema["properties"];
  if (!properties || typeof properties !== "object" || properties === null) {
    return [];
  }

  const tokens: string[] = [];
  const props = properties as Record<string, unknown>;

  for (const propName of Object.keys(props)) {
    const propDef = props[propName];
    if (propDef && typeof propDef === "object" && propDef !== null) {
      const t = (propDef as Record<string, unknown>)["type"];
      tokens.push(typeof t === "string" ? `${propName}:${t}` : propName);
    } else {
      tokens.push(propName);
    }
  }

  return tokens.sort();
}

/**
 * Normalise a description string: lowercase, collapse whitespace, strip ends.
 */
function normaliseDescription(desc: string | undefined): string {
  if (!desc) {
    return "";
  }
  return desc.toLowerCase().replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a canonical, order-insensitive signature string for a named tool.
 *
 * The signature is composed of:
 *   - the tool's name
 *   - a normalised description (lowercased, whitespace-collapsed)
 *   - sorted parameter property names (with types when available)
 *
 * Stable regardless of property declaration order in the schema.
 */
export function computeToolSignature(name: string, tool: Tool): string {
  const descPart = normaliseDescription(tool.description);
  const schemaParts = extractSchemaTokens(tool.inputSchema);
  // Pipe-separated sections keep tokens within each section unambiguous.
  return [name, descPart, schemaParts.join(",")].join("|");
}

/**
 * Compute the token-set Jaccard similarity between two signature strings.
 *
 *   Jaccard(A, B) = |A ∩ B| / |A ∪ B|
 *
 * Splits on whitespace and also on the pipe/comma delimiters used by
 * `computeToolSignature` so that structural differences (e.g. a parameter
 * missing from one tool) are properly reflected.
 */
function jaccardSimilarity(sigA: string, sigB: string): number {
  const tokenise = (s: string): Set<string> =>
    new Set(s.split(/[\s|,]+/).filter((t) => t.length > 0));

  const setA = tokenise(sigA);
  const setB = tokenise(sigB);

  if (setA.size === 0 && setB.size === 0) {
    return 1;
  }
  if (setA.size === 0 || setB.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection += 1;
    }
  }

  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Collapse near-duplicate tools in a name→Tool record.
 *
 * When `options.enabled` is falsy (the default), returns the original record
 * and an empty `removed` array — byte-for-byte unchanged behaviour.
 *
 * When enabled, tools whose token-set Jaccard similarity (over their canonical
 * signatures) meets or exceeds `options.threshold` (default 0.9) are collapsed
 * to a single representative (the first in stable iteration order).
 *
 * Any exception thrown internally returns the ORIGINAL tool set (fail-open).
 */
export function dedupeTools<T extends Tool>(
  tools: Record<string, T>,
  options: ToolDedupConfig,
): ToolDedupResult<Record<string, T>> {
  const noOp: ToolDedupResult<Record<string, T>> = { tools, removed: [] };

  if (!options.enabled) {
    return noOp;
  }

  try {
    const rawThreshold = options.threshold ?? 0.9;
    const threshold = Math.min(1, Math.max(0, rawThreshold));
    const entries = Object.entries(tools);

    if (entries.length <= 1) {
      return noOp;
    }

    // Pre-compute signatures once.
    const signatures: Map<string, string> = new Map();
    for (const [name, tool] of entries) {
      signatures.set(name, computeToolSignature(name, tool));
    }

    // representative[toolName] = name of the cluster representative.
    // Tools not yet assigned to a cluster act as their own representative.
    const representativeOf: Map<string, string> = new Map();

    for (const [nameA] of entries) {
      if (representativeOf.has(nameA)) {
        // Already absorbed into another cluster.
        continue;
      }
      const sigA = signatures.get(nameA) ?? "";

      for (const [nameB] of entries) {
        if (nameA === nameB || representativeOf.has(nameB)) {
          continue;
        }
        const sigB = signatures.get(nameB) ?? "";
        const sim = jaccardSimilarity(sigA, sigB);
        if (sim >= threshold) {
          representativeOf.set(nameB, nameA);
        }
      }
    }

    if (representativeOf.size === 0) {
      return noOp;
    }

    const dedupedTools: Record<string, T> = {};
    const removed: ToolDedupResult<Record<string, T>>["removed"] = [];

    for (const [name, tool] of entries) {
      const rep = representativeOf.get(name);
      if (rep !== undefined) {
        // Compute similarity again to include in the removed record.
        const sim = jaccardSimilarity(
          signatures.get(name) ?? "",
          signatures.get(rep) ?? "",
        );
        removed.push({ name, duplicateOf: rep, similarity: sim });
      } else {
        dedupedTools[name] = tool;
      }
    }

    return { tools: dedupedTools, removed };
  } catch {
    // Fail open — return the original set.
    return noOp;
  }
}
