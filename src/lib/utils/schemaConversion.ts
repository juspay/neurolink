import { zodToJsonSchema } from "zod-to-json-schema";
import { jsonSchemaToZod } from "json-schema-to-zod";
import { z } from "zod";
import type { ZodUnknownSchema, ZodToJsonSchemaInput } from "../types/index.js";
import { logger } from "./logger.js";

/**
 * Resolve a deep JSON pointer path within a schema.
 * Handles paths like "#/definitions/ToolParameters/properties/foo/properties/bar"
 *
 * Implements RFC 6901 token decoding so property names containing the literal
 * characters "/" or "~" can still be resolved (their escaped forms are "~1"
 * and "~0" respectively). Because "#/..." is the URI-fragment form of a JSON
 * Pointer (RFC 6901 §6), each segment may also be percent-encoded; we decode
 * that first.
 *
 * Order matters: percent-decode → "~1" → "/" → "~0" → "~". Reversing the
 * tilde steps would let "~01" round-trip to "/" instead of the intended "~1".
 */
function resolveDeepRef(
  rootSchema: Record<string, unknown>,
  refPath: string,
): Record<string, unknown> | undefined {
  // Strip the leading "#/" then split + decode each segment per RFC 6901
  const pathParts = refPath
    .replace(/^#\//, "")
    .split("/")
    .map((seg) =>
      safePercentDecode(seg).replace(/~1/g, "/").replace(/~0/g, "~"),
    );

  let current: unknown = rootSchema;
  for (const part of pathParts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  if (current && typeof current === "object") {
    return current as Record<string, unknown>;
  }
  return undefined;
}

/**
 * Percent-decode a JSON Pointer segment defensively. Falls back to the raw
 * segment if the input contains a malformed escape sequence (decodeURIComponent
 * throws URIError on those) — better to attempt a literal match than fail the
 * whole resolution.
 */
function safePercentDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * Inline a JSON Schema by recursively resolving all $ref references.
 * zodToJsonSchema with 'name' option produces schemas with $ref pointing to definitions.
 * Some SDKs (like @google/genai) expect flat schemas without $ref.
 *
 * This function handles:
 * - Top-level $ref resolution
 * - Nested $ref within properties, items, additionalProperties
 * - $ref within allOf, anyOf, oneOf arrays
 * - Deep $ref paths like "#/definitions/Foo/properties/bar"
 * - Circular reference detection to prevent infinite loops
 */
export function inlineJsonSchema(
  schema: Record<string, unknown>,
  definitions?: Record<string, Record<string, unknown>>,
  visited: Set<string> = new Set(),
  rootSchema?: Record<string, unknown>,
): Record<string, unknown> {
  // Use definitions from schema if not provided
  const defs =
    definitions ||
    (schema.definitions as Record<string, Record<string, unknown>>);

  // Keep track of the root schema for deep ref resolution
  const root = rootSchema || schema;

  // Handle $ref at current level
  if (typeof schema.$ref === "string" && schema.$ref.startsWith("#/")) {
    const refPath = schema.$ref;

    // Prevent circular reference infinite loops
    if (visited.has(refPath)) {
      logger.debug(
        `[SCHEMA-INLINE] Circular reference detected for: ${refPath}`,
      );
      // Return a simple object placeholder for circular refs
      return { type: "object" };
    }

    // Try simple definition lookup first (for #/definitions/SomeName)
    if (refPath.startsWith("#/definitions/")) {
      const defName = refPath.replace("#/definitions/", "");

      // Check if it's a simple definition name (no slashes after definitions/)
      if (!defName.includes("/") && defs && defs[defName]) {
        visited.add(refPath);
        const resolved = inlineJsonSchema(
          { ...defs[defName] },
          defs,
          visited,
          root,
        );
        visited.delete(refPath);
        return resolved;
      }
    }

    // Try deep path resolution for complex paths like
    // #/definitions/ToolParameters/properties/accountPerformance/properties/roas
    const resolved = resolveDeepRef(root, refPath);
    if (resolved) {
      visited.add(refPath);
      const inlined = inlineJsonSchema({ ...resolved }, defs, visited, root);
      visited.delete(refPath);
      return inlined;
    }

    logger.debug(`[SCHEMA-INLINE] Could not resolve $ref: ${refPath}`);
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
            root,
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
            ? inlineJsonSchema(
                item as Record<string, unknown>,
                defs,
                visited,
                root,
              )
            : item,
        );
      } else {
        result[key] = inlineJsonSchema(
          value as Record<string, unknown>,
          defs,
          visited,
          root,
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
        root,
      );
    } else if (
      (key === "allOf" || key === "anyOf" || key === "oneOf") &&
      Array.isArray(value)
    ) {
      // Handle composition schemas
      result[key] = value.map((item) =>
        item && typeof item === "object"
          ? inlineJsonSchema(
              item as Record<string, unknown>,
              defs,
              visited,
              root,
            )
          : item,
      );
    } else if (key === "not" && value && typeof value === "object") {
      result[key] = inlineJsonSchema(
        value as Record<string, unknown>,
        defs,
        visited,
        root,
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
        root,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Recursively ensure all nested schemas have a type field.
 * Google Vertex AI requires ALL schema objects (including nested properties) to have a type field.
 * This function walks through the schema tree and adds type:"object" to any object-like schema
 * that's missing its type field.
 */
export function ensureNestedSchemaTypes(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema || typeof schema !== "object") {
    return {};
  }

  let result: Record<string, unknown> = { ...schema };

  // CRITICAL FIX: Flatten single-item allOf for Google Vertex AI compatibility
  // When we have { allOf: [{ type: "object", ... }], nullable: true }, flatten it to:
  // { type: "object", ..., nullable: true }
  if (
    result.allOf &&
    Array.isArray(result.allOf) &&
    result.allOf.length === 1 &&
    result.allOf[0] &&
    typeof result.allOf[0] === "object"
  ) {
    const innerSchema = result.allOf[0] as Record<string, unknown>;
    // Only flatten if inner schema has meaningful content (type, properties, items, etc.)
    if (
      innerSchema.type ||
      innerSchema.properties ||
      innerSchema.items ||
      innerSchema.enum
    ) {
      logger.debug(
        `[SCHEMA-TYPE-FIX] Flattening single-item allOf with type: ${innerSchema.type}`,
      );
      // Merge: inner schema properties take precedence, except for wrapper's metadata
      const { allOf: _ignored, ...wrapperProps } = result;
      result = {
        ...innerSchema,
        ...wrapperProps, // Keep wrapper's nullable, description, etc.
      };
      // If inner schema had its own nullable/description, restore them
      if (innerSchema.description && !wrapperProps.description) {
        result.description = innerSchema.description;
      }
    }
  }

  // Infer type from structure if missing
  if (!result.type) {
    // If it has properties, it's an object
    if (result.properties) {
      result.type = "object";
      logger.debug(
        `[SCHEMA-TYPE-FIX] Added type:"object" to schema with properties`,
      );
    }
    // If it has items, it's an array
    else if (result.items) {
      result.type = "array";
      logger.debug(`[SCHEMA-TYPE-FIX] Added type:"array" to schema with items`);
    }
    // If it has enum, infer from enum values — but only when ALL elements
    // share the same primitive type. A mixed enum like [1, "x"] would
    // otherwise be silently narrowed to whatever the first element is.
    else if (
      result.enum &&
      Array.isArray(result.enum) &&
      result.enum.length > 0
    ) {
      if (result.enum.every((v) => typeof v === "string")) {
        result.type = "string";
        logger.debug(
          `[SCHEMA-TYPE-FIX] Added type:"string" to schema with enum`,
        );
      } else if (result.enum.every((v) => typeof v === "number")) {
        result.type = "number";
        logger.debug(
          `[SCHEMA-TYPE-FIX] Added type:"number" to schema with enum`,
        );
      }
      // Mixed-type enum: leave result.type unset rather than narrow it.
    }
    // If it has allOf with typed schemas, infer from first item
    else if (
      result.allOf &&
      Array.isArray(result.allOf) &&
      result.allOf.length > 0
    ) {
      const firstItem = result.allOf[0] as Record<string, unknown>;
      if (firstItem && firstItem.type) {
        result.type = firstItem.type;
        logger.debug(
          `[SCHEMA-TYPE-FIX] Inferred type from allOf: ${result.type}`,
        );
      }
    }
  }

  // Recursively process properties
  if (result.properties && typeof result.properties === "object") {
    const properties: Record<string, unknown> = {};
    for (const [propName, propSchema] of Object.entries(
      result.properties as Record<string, unknown>,
    )) {
      if (propSchema && typeof propSchema === "object") {
        properties[propName] = ensureNestedSchemaTypes(
          propSchema as Record<string, unknown>,
        );
      } else {
        properties[propName] = propSchema;
      }
    }
    result.properties = properties;
  }

  // Recursively process items (for arrays)
  if (result.items && typeof result.items === "object") {
    if (Array.isArray(result.items)) {
      result.items = result.items.map((item) =>
        item && typeof item === "object"
          ? ensureNestedSchemaTypes(item as Record<string, unknown>)
          : item,
      );
    } else {
      result.items = ensureNestedSchemaTypes(
        result.items as Record<string, unknown>,
      );
    }
  }

  // Recursively process additionalProperties
  if (
    result.additionalProperties &&
    typeof result.additionalProperties === "object"
  ) {
    result.additionalProperties = ensureNestedSchemaTypes(
      result.additionalProperties as Record<string, unknown>,
    );
  }

  // Recursively process allOf, anyOf, oneOf
  for (const key of ["allOf", "anyOf", "oneOf"] as const) {
    if (result[key] && Array.isArray(result[key])) {
      result[key] = (result[key] as unknown[]).map((item) =>
        item && typeof item === "object"
          ? ensureNestedSchemaTypes(item as Record<string, unknown>)
          : item,
      );
    }
  }

  return result;
}

/**
 * Convert Zod schema to JSON Schema format for provider APIs.
 *
 * Handles three input types:
 * 1. Zod schemas (have `_def.typeName`) -- converted via zod-to-json-schema
 * 2. AI SDK `jsonSchema()` wrappers (have `.jsonSchema` property) -- extracted directly
 * 3. Plain JSON Schema objects (have `type`/`properties` but no `_def`) -- returned as-is
 */
export function convertZodToJsonSchema(zodSchema: ZodUnknownSchema): object {
  const schema = zodSchema as unknown as Record<string, unknown>;

  if (!schema || typeof schema !== "object") {
    return { type: "object", properties: {} };
  }

  // AI SDK jsonSchema() wrapper — extract the inner JSON Schema directly
  if (
    "jsonSchema" in schema &&
    schema.jsonSchema !== null &&
    typeof schema.jsonSchema === "object"
  ) {
    const extracted = schema.jsonSchema as Record<string, unknown>;
    return ensureNestedSchemaTypes(ensureTypeField(extracted));
  }

  // Plain JSON Schema object (from external MCP tools) — no Zod internals
  if (!isZodSchema(schema)) {
    return ensureNestedSchemaTypes(
      ensureTypeField(schema as Record<string, unknown>),
    );
  }

  // Actual Zod schema — convert via zod-to-json-schema
  try {
    // Zod 4→3 boundary: zodToJsonSchema types reference Zod 3's ZodSchema via zod/v3.
    // Runtime compatible — cast through unknown at this third-party boundary only.
    const zodV3Schema = zodSchema as unknown as ZodToJsonSchemaInput;
    const jsonSchema = zodToJsonSchema(zodV3Schema, {
      name: "ToolParameters",
      target: "openApi3", // Use OpenAPI 3.0 for nullable: true instead of anyOf with null (required for Vertex AI)
      errorMessages: true,
    }) as Record<string, unknown>;

    // zodToJsonSchema with 'name' produces { $ref: "#/definitions/ToolParameters", definitions: {...} }
    // Inline the $ref to produce a flat schema, ensure the root has a type
    // field, then walk the tree so nested objects/arrays/additionalProperties
    // also pick up an inferred type (Vertex/Gemini require it everywhere).
    const inlined = inlineJsonSchema(jsonSchema);
    return ensureNestedSchemaTypes(ensureTypeField(inlined));
  } catch (error) {
    logger.warn("Failed to convert Zod schema to JSON Schema", {
      error: error instanceof Error ? error.message : String(error),
    });
    return { type: "object", properties: {} };
  }
}

export function normalizeJsonSchemaObject(
  schema: Record<string, unknown> | undefined | null,
): Record<string, unknown> {
  return ensureTypeField(
    inlineJsonSchema(
      schema ? { ...schema } : { type: "object", properties: {} },
    ),
  );
}

/**
 * Ensure a JSON Schema object has a `type` field (required by Vertex/Gemini).
 */
function ensureTypeField(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  if (!schema.type) {
    // Schemas using composition keywords (anyOf/oneOf/allOf) deliberately omit type
    if (schema.anyOf || schema.oneOf || schema.allOf) {
      return schema;
    }

    const hadProperties = !!schema.properties;
    const result: Record<string, unknown> = {
      ...schema,
      type: "object" as const,
    };
    if (!result.properties) {
      result.properties = {};
    }
    logger.debug("[SCHEMA-TYPE-FIX] Added missing type field to JSON Schema", {
      fixedType: "object",
      addedProperties: !hadProperties,
    });
    return result;
  }
  return schema;
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
