import { logger } from "./logger.js";
import type { ToolCallRepairFunction, ToolSet } from "../types/index.js";
import type { JSONSchema7, LanguageModelV3ToolCall } from "../types/index.js";

/**
 * Create an `experimental_repairToolCall` handler for streamText/generateText.
 * Fully dynamic — reads the tool schema at repair time, no configuration needed.
 */
export function createToolCallRepair(): ToolCallRepairFunction<ToolSet> {
  return async ({ toolCall, tools, inputSchema, error }) => {
    // Import error classes lazily to avoid circular deps at module level
    const { NoSuchToolError: NoSuchTool, InvalidToolInputError: InvalidInput } =
      await import("./generationErrors.js");

    if (NoSuchTool.isInstance(error)) {
      return repairToolName(toolCall, Object.keys(tools));
    }

    if (InvalidInput.isInstance(error)) {
      try {
        const schema = await inputSchema({ toolName: toolCall.toolName });
        return repairToolInput(toolCall, schema);
      } catch {
        // inputSchema() failed — can't repair without schema
        return null;
      }
    }

    return null;
  };
}

// ─── Tool Name Repair ──────────────────────────────────────────────

/**
 * Attempt to match a wrong tool name against available tool names.
 * Strategies (in order): case-insensitive exact → substring → Levenshtein.
 */
function repairToolName(
  toolCall: LanguageModelV3ToolCall,
  availableTools: string[],
): LanguageModelV3ToolCall | null {
  const called = toolCall.toolName;

  // Guard: empty or whitespace-only tool name cannot be meaningfully repaired
  if (!called || called.trim().length === 0) {
    return null;
  }

  // 1. Case-insensitive exact match
  const ciMatch = availableTools.find(
    (t) => t.toLowerCase() === called.toLowerCase(),
  );
  if (ciMatch) {
    logger.debug(
      `[ToolCallRepair] Name repair (case): "${called}" → "${ciMatch}"`,
    );
    return { ...toolCall, toolName: ciMatch };
  }

  // 2. Substring match: "search_file" is substring of "search_files" or vice versa.
  // Only accept when exactly one tool matches to avoid ambiguous repairs.
  const calledLower = called.toLowerCase();
  const subCandidates = availableTools.filter((t) => {
    const tLower = t.toLowerCase();
    return tLower.includes(calledLower) || calledLower.includes(tLower);
  });
  if (subCandidates.length === 1) {
    logger.debug(
      `[ToolCallRepair] Name repair (substring): "${called}" → "${subCandidates[0]}"`,
    );
    return { ...toolCall, toolName: subCandidates[0] };
  }

  // 3. Levenshtein distance — accept if normalized distance < 0.3
  // Compare by normalized score (not raw edits) so length differences don't skew selection.
  let bestMatch: string | null = null;
  let bestNormalized = Infinity;
  for (const t of availableTools) {
    const dist = levenshtein(calledLower, t.toLowerCase());
    const maxLen = Math.max(called.length, t.length);
    const normalized = maxLen === 0 ? 0 : dist / maxLen;
    if (normalized < 0.3 && normalized < bestNormalized) {
      bestNormalized = normalized;
      bestMatch = t;
    }
  }
  if (bestMatch) {
    logger.debug(
      `[ToolCallRepair] Name repair (levenshtein ${bestNormalized.toFixed(2)}): "${called}" → "${bestMatch}"`,
    );
    return { ...toolCall, toolName: bestMatch };
  }

  logger.debug(
    `[ToolCallRepair] Could not repair tool name "${called}". Available: [${availableTools.join(", ")}]`,
  );
  return null;
}

// ─── Tool Input Repair ─────────────────────────────────────────────

/**
 * Attempt to repair wrong parameter names and types using the JSON schema.
 * Compares LLM-provided keys against schema properties dynamically.
 *
 * `toolCall.input` is a JSON string per LanguageModelV3ToolCall.
 */
function repairToolInput(
  toolCall: LanguageModelV3ToolCall,
  schema: JSONSchema7,
): LanguageModelV3ToolCall | null {
  let args: unknown;
  try {
    args = JSON.parse(toolCall.input);
  } catch {
    return null; // input is not valid JSON — can't repair
  }
  if (!args || typeof args !== "object" || Array.isArray(args)) {
    return null;
  }

  const schemaProps = (schema as Record<string, unknown>).properties as
    | Record<string, unknown>
    | undefined;
  if (!schemaProps) {
    return null;
  }

  const expectedKeys = Object.keys(schemaProps);
  const inputObj = args as Record<string, unknown>;
  const inputKeys = Object.keys(inputObj);
  const repaired = Object.create(null) as Record<string, unknown>;
  let didRepair = false;
  const dropUnknown =
    (schema as Record<string, unknown>).additionalProperties === false;

  for (const inputKey of inputKeys) {
    // Already matches a schema property — keep as-is
    if (expectedKeys.includes(inputKey)) {
      repaired[inputKey] = inputObj[inputKey];
      continue;
    }

    // Try to find a matching schema property
    const mapped = findMatchingKey(inputKey, expectedKeys);
    if (mapped) {
      // Don't overwrite an already-populated canonical key — but still mark as repaired
      // so the function returns the corrected object instead of null.
      if (Object.prototype.hasOwnProperty.call(repaired, mapped)) {
        didRepair = true;
        continue;
      }
      logger.debug(
        `[ToolCallRepair] Param repair: "${inputKey}" → "${mapped}" (tool: ${toolCall.toolName})`,
      );
      repaired[mapped] = inputObj[inputKey];
      didRepair = true;
    } else if (dropUnknown) {
      // Schema forbids extra properties — drop unmapped keys
      logger.debug(
        `[ToolCallRepair] Dropping unmapped key "${inputKey}" (additionalProperties: false, tool: ${toolCall.toolName})`,
      );
      didRepair = true;
    } else {
      // Unknown key — pass through (schema allows additionalProperties)
      repaired[inputKey] = inputObj[inputKey];
    }
  }

  // Type coercion based on schema types
  for (const key of Object.keys(repaired)) {
    const propSchema = schemaProps[key] as Record<string, unknown> | undefined;
    if (!propSchema) {
      continue;
    }
    const coerced = coerceType(repaired[key], propSchema);
    if (coerced !== repaired[key]) {
      logger.debug(
        `[ToolCallRepair] Type coercion on "${key}": ${typeof repaired[key]} → ${typeof coerced} (tool: ${toolCall.toolName})`,
      );
      repaired[key] = coerced;
      didRepair = true;
    }
  }

  if (didRepair) {
    return { ...toolCall, input: JSON.stringify(repaired) };
  }

  return null;
}

/**
 * Find a matching schema key for a mismatched input key.
 * Strategies: case-insensitive → Levenshtein (threshold ≤2 edits).
 */
function findMatchingKey(
  inputKey: string,
  schemaKeys: string[],
): string | null {
  const inputLower = inputKey.toLowerCase();

  // Case-insensitive match
  const ciMatch = schemaKeys.find((k) => k.toLowerCase() === inputLower);
  if (ciMatch) {
    return ciMatch;
  }

  // Levenshtein — threshold ≤2 edits
  let best: string | null = null;
  let bestDist = Infinity;
  for (const k of schemaKeys) {
    const dist = levenshtein(inputLower, k.toLowerCase());
    if (dist <= 2 && dist < bestDist) {
      bestDist = dist;
      best = k;
    }
  }
  return best;
}

// ─── Type Coercion ─────────────────────────────────────────────────

/**
 * Coerce a value to match the expected schema type.
 * Handles: string→number, JSON string→object, JSON string→array, value→[value].
 */
function coerceType(
  value: unknown,
  propSchema: Record<string, unknown>,
): unknown {
  const expectedType = propSchema.type as string | undefined;
  if (!expectedType || value === null || value === undefined) {
    return value;
  }

  // String → Number (trim first, reject empty/whitespace, require finite result)
  if (expectedType === "number" && typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed !== "") {
      const num = Number(trimmed);
      if (isFinite(num)) {
        return num;
      }
    }
  }

  // String → Integer (strict: reject "12abc", "3.7", etc.)
  if (expectedType === "integer" && typeof value === "string") {
    const trimmed = value.trim();
    if (/^[+-]?\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      if (Number.isSafeInteger(num)) {
        return num;
      }
    }
  }

  // String → Boolean
  if (expectedType === "boolean" && typeof value === "string") {
    if (value.toLowerCase() === "true") {
      return true;
    }
    if (value.toLowerCase() === "false") {
      return false;
    }
  }

  // JSON string → Object
  if (expectedType === "object" && typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON — return as-is
    }
  }

  // JSON string → Array
  if (expectedType === "array" && typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Not valid JSON — return as-is
    }
  }

  // Single non-string value → Array (wrap).
  // Strings are excluded because they are more likely a JSON-encoded array
  // that failed to parse above, and wrapping "foo" into ["foo"] is rarely correct.
  if (
    expectedType === "array" &&
    !Array.isArray(value) &&
    typeof value !== "string"
  ) {
    return [value];
  }

  return value;
}

// ─── Levenshtein Distance ──────────────────────────────────────────

/**
 * Compute Levenshtein edit distance between two strings.
 * Uses the iterative matrix approach — O(m*n) time, O(min(m,n)) space.
 */
function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  // Use shorter string as column to minimize space
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const aLen = a.length;
  const bLen = b.length;
  let prev = new Array<number>(aLen + 1);
  let curr = new Array<number>(aLen + 1);

  for (let i = 0; i <= aLen; i++) {
    prev[i] = i;
  }

  for (let j = 1; j <= bLen; j++) {
    curr[0] = j;
    for (let i = 1; i <= aLen; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1, // deletion
        curr[i - 1] + 1, // insertion
        prev[i - 1] + cost, // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[aLen];
}
