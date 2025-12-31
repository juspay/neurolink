import { zodToJsonSchema } from "zod-to-json-schema";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { z } from "zod";
import type { ZodUnknownSchema } from "../types/tools.js";
import { logger } from "./logger.js";

/**
 * Inline a JSON Schema by recursively resolving all $ref references.
 * zodToJsonSchema with 'name' option produces schemas with $ref pointing to definitions.
 * Some SDKs (like @google/genai) expect flat schemas without $ref.
 *
 * This function handles:
 * - Top-level $ref resolution
 * - Nested $ref within properties, items, additionalProperties
 * - $ref within allOf, anyOf, oneOf arrays
 * - Circular reference detection to prevent infinite loops
 */
export function inlineJsonSchema(
  schema: Record<string, unknown>,
  definitions?: Record<string, Record<string, unknown>>,
  visited: Set<string> = new Set(),
): Record<string, unknown> {
  // Use definitions from schema if not provided
  const defs =
    definitions ||
    (schema.definitions as Record<string, Record<string, unknown>>);

  // Handle $ref at current level
  if (
    typeof schema.$ref === "string" &&
    schema.$ref.startsWith("#/definitions/")
  ) {
    const defName = schema.$ref.replace("#/definitions/", "");

    // Prevent circular reference infinite loops
    if (visited.has(defName)) {
      logger.debug(
        `[SCHEMA-INLINE] Circular reference detected for: ${defName}`,
      );
      // Return a simple object placeholder for circular refs
      return { type: "object" };
    }

    if (defs && defs[defName]) {
      visited.add(defName);
      // Recursively inline the resolved definition
      const resolved = inlineJsonSchema({ ...defs[defName] }, defs, visited);
      visited.delete(defName);
      return resolved;
    }
  }

  // Create result without $ref and definitions
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // Skip $ref and definitions keys
    if (key === "$ref" || key === "definitions") {
      continue;
    }

    // Recursively process nested schemas
    if (key === "properties" && value && typeof value === "object") {
      const properties: Record<string, unknown> = {};
      for (const [propName, propSchema] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (propSchema && typeof propSchema === "object") {
          properties[propName] = inlineJsonSchema(
            propSchema as Record<string, unknown>,
            defs,
            visited,
          );
        } else {
          properties[propName] = propSchema;
        }
      }
      result[key] = properties;
    } else if (key === "items" && value && typeof value === "object") {
      // Handle array items schema
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          item && typeof item === "object"
            ? inlineJsonSchema(item as Record<string, unknown>, defs, visited)
            : item,
        );
      } else {
        result[key] = inlineJsonSchema(
          value as Record<string, unknown>,
          defs,
          visited,
        );
      }
    } else if (
      key === "additionalProperties" &&
      value &&
      typeof value === "object"
    ) {
      result[key] = inlineJsonSchema(
        value as Record<string, unknown>,
        defs,
        visited,
      );
    } else if (
      (key === "allOf" || key === "anyOf" || key === "oneOf") &&
      Array.isArray(value)
    ) {
      // Handle composition schemas
      result[key] = value.map((item) =>
        item && typeof item === "object"
          ? inlineJsonSchema(item as Record<string, unknown>, defs, visited)
          : item,
      );
    } else if (key === "not" && value && typeof value === "object") {
      result[key] = inlineJsonSchema(
        value as Record<string, unknown>,
        defs,
        visited,
      );
    } else if (
      (key === "if" || key === "then" || key === "else") &&
      value &&
      typeof value === "object"
    ) {
      result[key] = inlineJsonSchema(
        value as Record<string, unknown>,
        defs,
        visited,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Convert Zod schema to JSON Schema format for Claude AI
 */
export function convertZodToJsonSchema(zodSchema: ZodUnknownSchema): object {
  try {
    // Use a type assertion that bypasses the infinite recursion check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jsonSchema = zodToJsonSchema(zodSchema as any, {
      name: "ToolParameters",
      target: "jsonSchema7",
      errorMessages: true,
    }) as Record<string, unknown>;

    // CRITICAL FIX: Ensure schema always has a proper type field for Google Vertex AI
    if (!jsonSchema.type) {
      // Default to "object" type if not specified, as most tool schemas are objects
      jsonSchema.type = "object";

      // If no properties, ensure it's at least an empty object schema
      if (!jsonSchema.properties) {
        jsonSchema.properties = {};
      }

      logger.info(`[SCHEMA-TYPE-FIX] Added missing type field to JSON Schema`, {
        originalType: undefined,
        fixedType: jsonSchema.type,
        hasProperties: !!jsonSchema.properties,
        addedEmptyProperties: !jsonSchema.properties,
      });
    }

    logger.debug("Converted Zod schema to JSON Schema", {
      hasProperties: !!jsonSchema.properties,
      propertiesCount: Object.keys(jsonSchema.properties || {}).length,
      schemaType: jsonSchema.type,
      hasTypeField: !!jsonSchema.type,
    });

    return jsonSchema;
  } catch (error) {
    logger.warn("Failed to convert Zod schema to JSON Schema", {
      error: error instanceof Error ? error.message : String(error),
    });
    // Return a valid empty object schema instead of empty object
    return {
      type: "object",
      properties: {},
    };
  }
}

/**
 * Check if a value is a Zod schema
 */
export function isZodSchema(value: unknown): boolean {
  return !!(
    value &&
    typeof value === "object" &&
    "_def" in value &&
    typeof (value as Record<string, unknown>).parse === "function"
  );
}

/**
 * Convert JSON Schema to Zod schema format using official json-schema-to-zod library
 * This ensures complete preservation of all schema structure and validation rules
 */
export function convertJsonSchemaToZod(
  jsonSchema: Record<string, unknown>,
): ZodUnknownSchema {
  const startTime = Date.now();

  try {
    // Handle empty or invalid schemas
    if (!jsonSchema || typeof jsonSchema !== "object") {
      logger.debug(
        "🔍 [SCHEMA-CONVERSION] Invalid or empty JSON schema, using fallback",
      );
      return z.object({}).passthrough();
    }

    // Log detailed input schema for debugging
    logger.debug(
      "🔍 [SCHEMA-CONVERSION] ===== STARTING OFFICIAL LIBRARY CONVERSION =====",
    );
    logger.debug("🔍 [SCHEMA-CONVERSION] Input JSON Schema:", {
      type: jsonSchema.type,
      hasProperties: !!jsonSchema.properties,
      propertiesCount: jsonSchema.properties
        ? Object.keys(jsonSchema.properties as object).length
        : 0,
      requiredCount: Array.isArray(jsonSchema.required)
        ? jsonSchema.required.length
        : 0,
      required: jsonSchema.required,
      sampleProperties: jsonSchema.properties
        ? Object.keys(jsonSchema.properties as object).slice(0, 5)
        : [],
    });

    // Use official library to convert JSON Schema to Zod code
    const zodCodeResult = jsonSchemaToZod(jsonSchema, {
      module: "esm",
      name: "schema",
    });

    logger.debug("🔍 [SCHEMA-CONVERSION] Generated Zod code:", {
      codeLength: zodCodeResult.length,
      codePreview: zodCodeResult.substring(0, 200) + "...",
    });

    // Extract the actual Zod schema expression from the generated code
    // Generated code looks like: "import { z } from "zod"\n\nexport const schema = z.object({...})\n"
    const schemaMatch = zodCodeResult.match(
      /export const schema = (z\..+?)(?:\n|$)/s,
    );
    if (!schemaMatch) {
      throw new Error("Could not extract Zod schema from generated code");
    }

    const schemaExpression = schemaMatch[1].trim();
    logger.debug("🔍 [SCHEMA-CONVERSION] Extracted schema expression:", {
      expression: schemaExpression.substring(0, 300) + "...",
    });

    // Use Function constructor instead of eval for better scope control
    const createZodSchema = new Function("z", `return ${schemaExpression}`);
    const zodSchema = createZodSchema(z);

    const conversionTime = Date.now() - startTime;

    logger.debug("🔍 [SCHEMA-CONVERSION] ===== CONVERSION SUCCESSFUL =====", {
      inputType: jsonSchema.type,
      propertiesCount: jsonSchema.properties
        ? Object.keys(jsonSchema.properties as object).length
        : 0,
      requiredCount: Array.isArray(jsonSchema.required)
        ? jsonSchema.required.length
        : 0,
      conversionSuccess: true,
      conversionTimeMs: conversionTime,
      libraryUsed: "json-schema-to-zod-official",
      zodSchemaType: zodSchema?.constructor?.name || "unknown",
    });

    return zodSchema;
  } catch (error) {
    const conversionTime = Date.now() - startTime;

    logger.warn(
      "🚨 [SCHEMA-CONVERSION] Official library conversion failed, using passthrough fallback",
      {
        error: error instanceof Error ? error.message : String(error),
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        inputSchemaType: jsonSchema?.type,
        inputSchemaKeys:
          jsonSchema && typeof jsonSchema === "object"
            ? Object.keys(jsonSchema)
            : [],
        conversionTimeMs: conversionTime,
        libraryUsed: "json-schema-to-zod-official-FAILED",
      },
    );

    return z.object({}).passthrough();
  }
}
