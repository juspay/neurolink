/**
 * Structured Output Utilities
 *
 * Provides production-grade JSON extraction and validation for the 3-phase
 * structured output system.
 *
 * Phase 1: Extract JSON from raw text with schema validation
 * Phase 2: Validate and repair JSON (future)
 * Phase 3: Fallback to generateObject (future)
 *
 * @module utils/structuredOutput
 */

import type { z } from "zod";
import type { ZodUnknownSchema } from "../types/tools.js";
import { isZodSchema, convertZodToJsonSchema } from "./schemaConversion.js";
import { logger } from "./logger.js";
import type { TextGenerationOptions } from "../index.js";
import type { CoreMessage, LanguageModelV1 } from "ai";
import { generateText } from "ai";

/**
 * Extract and parse JSON from LLM response text (no validation)
 *
 * Uses 4 extraction strategies to handle various LLM response formats:
 * 1. Fence extraction (```json {...} ```)
 * 2. Brace-balanced extraction (tracks opening/closing braces)
 * 3. Direct parsing (clean JSON)
 * 4. Greedy extraction (fallback)
 *
 * @param text - Raw LLM response text that may contain JSON
 * @returns First successfully parsed JSON object, or null if none found
 *
 * @example
 * ```typescript
 * const text = '```json\n{"name": "Alice", "age": 30}\n```';
 * const parsed = extractAndParseJSON(text);
 * // parsed: { name: "Alice", age: 30 } or null
 * ```
 */
export function extractAndParseJSON(text: string): unknown | null {
  try {
    // Strategy 1: Extract from markdown fences
    const fenceMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    const fenceExtracted = fenceMatch ? fenceMatch[1].trim() : null;

    // Strategy 2: Brace-balanced extraction
    const braceBalanced = (() => {
      const startIndex = text.indexOf("{");
      if (startIndex === -1) {
        return null;
      }

      let braceCount = 0;
      for (let i = startIndex; i < text.length; i++) {
        if (text[i] === "{") {
          braceCount++;
        } else if (text[i] === "}") {
          braceCount--;
        }
        if (braceCount === 0) {
          return text.substring(startIndex, i + 1);
        }
      }
      return null;
    })();

    // Strategy 3: Greedy extraction
    const jsonExtracted = text.match(/\{[\s\S]*\}/)?.[0];

    // Try parsing candidates in order of success rate
    const candidates = [
      { source: "fence-extracted", text: fenceExtracted },
      { source: "brace-balanced", text: braceBalanced },
      { source: "original", text: text.trim() },
      { source: "json-extracted", text: jsonExtracted },
    ];

    for (const candidate of candidates) {
      if (!candidate.text) {
        continue;
      }

      try {
        const parsed = JSON.parse(candidate.text);

        // Type check: ensure it's an object
        if (parsed !== null && typeof parsed === "object") {
          logger.debug("[StructuredOutput] JSON extracted and parsed", {
            extractionMethod: candidate.source,
          });
          return parsed;
        }
      } catch {
        continue;
      }
    }

    logger.warn("[StructuredOutput] No valid JSON found in text", {
      textPreview: text.substring(0, 200),
    });
    return null;
  } catch (error) {
    logger.error("[StructuredOutput] JSON extraction exception", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Create unified schema instructions for Phase 1 prompt injection
 *
 * Converts a Zod schema to JSON Schema and injects it into the system prompt.
 * Uses simple JSON.stringify with emphatic formatting rules.
 *
 * @param schema - Zod schema or other schema format defining expected output structure
 * @returns Formatted instruction string to inject into system prompt
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: z.string().describe("User's full name"),
 *   age: z.number()
 * });
 *
 * const instructions = createUnifiedSchemaInstructions(schema);
 * // Returns JSON Schema with emphatic instructions (no examples, no hallucination)
 * ```
 */
export function createUnifiedSchemaInstructions(schema: unknown): string {
  // Reuse existing validation from schemaConversion.ts
  if (!isZodSchema(schema)) {
    logger.warn("[StructuredOutput] Non-Zod schema provided, using fallback");
    return FALLBACK_INSTRUCTIONS;
  }

  try {
    // Reuse existing conversion from schemaConversion.ts
    const jsonSchema = convertZodToJsonSchema(schema as ZodUnknownSchema);

    // Build emphatic instruction format
    let schemaInstruction = "\n\n" + "━".repeat(60) + "\n";
    schemaInstruction += "MANDATORY OUTPUT FORMAT\n";
    schemaInstruction += "━".repeat(60) + "\n\n";
    schemaInstruction += `**CRITICAL**: Your ENTIRE response MUST be a valid JSON object. No exceptions.

**FORMAT RULES** (violation will cause system failure):
1. Start your response with { and end with }
2. Output ONLY the JSON object - zero text before or after
3. Do NOT use markdown fences (\`\`\`json or \`\`\`)
4. Do NOT add explanations, comments, or preambles
5. Use valid JSON syntax (quoted keys/strings, no trailing commas)

Your JSON must match this exact schema:

${JSON.stringify(jsonSchema, null, 2)}

`;

    schemaInstruction += "━".repeat(60) + "\n";
    schemaInstruction += "FINAL REMINDER\n";
    schemaInstruction += "━".repeat(60) + "\n\n";
    schemaInstruction +=
      "OUTPUT = JSON OBJECT ONLY. First character: {. Last character: }.\n";
    schemaInstruction +=
      "Any deviation from pure JSON format will break the system.\n\n";

    return schemaInstruction;
  } catch (error) {
    logger.error("[StructuredOutput] Schema conversion failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return FALLBACK_INSTRUCTIONS;
  }
}

/**
 * Fallback instructions when schema is not available or conversion fails
 */
const FALLBACK_INSTRUCTIONS = `

${"━".repeat(60)}
MANDATORY OUTPUT FORMAT
${"━".repeat(60)}

**CRITICAL**: Your ENTIRE response MUST be a valid JSON object. No exceptions.

**FORMAT RULES** (violation will cause system failure):
1. Start your response with { and end with }
2. Output ONLY the JSON object - zero text before or after
3. Do NOT use markdown fences (\`\`\`json or \`\`\`)
4. Do NOT add explanations, comments, or preambles
5. Use valid JSON syntax (quoted keys/strings, no trailing commas)

${"━".repeat(60)}
FINAL REMINDER
${"━".repeat(60)}

OUTPUT = JSON OBJECT ONLY. First character: {. Last character: }.
Any deviation from pure JSON format will break the system.

`;

/**
 * Validate data against Zod schema and return detailed errors
 * Used for Phase 2 repair feasibility check
 *
 * @param data - Data to validate
 * @param schema - Zod schema to validate against
 * @returns Validation result with detailed error information
 */
export function validateAgainstSchema(
  data: unknown,
  schema: ZodUnknownSchema,
): {
  success: boolean;
  errors: Array<{ path: string; message: string; type: string }>;
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, errors: [] };
  }

  // Format Zod errors for repair with path/message/type
  const errors = result.error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    type: issue.code,
  }));

  return { success: false, errors };
}

/**
 * Create repair prompt with clear instructions
 * Shows: current JSON, required schema, and specific validation errors
 *
 * @param json - Current JSON that failed validation
 * @param schema - Zod schema to match
 * @param errors - Validation errors to fix
 * @returns Formatted repair prompt
 */
export function createRepairPrompt(
  response: unknown,
  schema: ZodUnknownSchema,
  errors: Array<{ path: string; message: string; type: string }>,
): string {
  const jsonSchema = convertZodToJsonSchema(schema);

  return (
    `${"━".repeat(60)}
REPAIR REQUIRED For the Output Generated
${"━".repeat(60)}` +
    (response === null
      ? `Your previous response did not contain any JSON. Please generate a valid JSON object that matches the required schema.
`
      : `Your previous JSON has validation errors. Fix them.`) +
    `PREVIOUS OUTPUT:
${JSON.stringify(response, null, 2)}

REQUIRED SCHEMA:
${JSON.stringify(jsonSchema, null, 2)}

VALIDATION ERRORS:
${errors.map((e, i) => `${i + 1}. Field "${e.path}": ${e.message}`).join("\n")}

INSTRUCTIONS:
- Return ONLY the corrected JSON object
- Fix ONLY the fields with errors listed above
- Keep all other fields exactly as they are
- Output must match the required schema exactly
- NO markdown fences, NO explanations, JUST JSON

Start your response with { and end with }

Corrected JSON:`
  );
}

/**
 * Attempt to repair JSON with targeted correction
 * Phase 2: Fast, cheap, focused repair for simple schema violations
 *
 * @param model - LanguageModelV1 instance to use for repair
 * @param json - Current JSON that failed validation
 * @param schema - Zod schema to match
 * @param errors - Validation errors to fix
 * @returns Repair result with success flag and repaired JSON if successful
 */
export async function attemptRepair(
  model: LanguageModelV1,
  response: unknown,
  schema: ZodUnknownSchema,
  options: TextGenerationOptions,
  errors: Array<{ path: string; message: string; type: string }>,
  messages: CoreMessage[],
): Promise<{ success: boolean; json: z.infer<typeof schema> | null }> {
  // Dynamic import to avoid circular dependencies
  const repairPrompt = createRepairPrompt(response, schema, errors);

  try {
    logger.debug("[StructuredOutput] Attempting Phase 2 repair", {
      errorCount: errors.length,
      errorPaths: errors.map((e) => e.path),
    });

    messages.push({
      role: "user",
      content: repairPrompt.trim(),
    });

    const result = await generateText({
      model: model,
      maxTokens: options.maxTokens,
      temperature: 0,
      messages: messages,
    });

    logger.debug("[StructuredOutput] Repair response received", {
      responseLength: result.text.length,
    });

    // Extract and validate repaired JSON
    const parsed = extractAndParseJSON(result.text);

    if (parsed !== null) {
      const validation = validateAgainstSchema(parsed, schema);

      if (validation.success) {
        logger.info("[StructuredOutput] Phase 2 repair successful", {
          errorCount: errors.length,
        });
        return { success: true, json: parsed as z.infer<typeof schema> };
      }
    }

    logger.debug("[StructuredOutput] Repair extraction/validation failed");
    return { success: false, json: null };
  } catch (error) {
    logger.warn("[StructuredOutput] Repair attempt failed", {
      error: error instanceof Error ? error.message : String(error),
      errorCount: errors.length,
    });
    return { success: false, json: null };
  }
}
