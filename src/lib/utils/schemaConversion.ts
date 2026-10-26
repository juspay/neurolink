import { createRequire } from "node:module";
import type { zodToJsonSchema as ZodToJsonSchemaFn } from "zod-to-json-schema";
import * as zodModule from "zod";
import { z } from "zod";
import type {
  SchemaConversionContext,
  SchemaConversionNode,
  SchemaRegexDrop,
  ZodUnknownSchema,
  ZodToJsonSchemaInput,
  Zod4NativeTarget,
  Zod4NativeParams,
} from "../types/index.js";
import { logger } from "./logger.js";
import { vetRegexPattern } from "../middleware/utils/regexSafety.js";

/**
 * zod-to-json-schema is loaded synchronously via require() on first actual
 * use, not via a top-level import, so merely importing this module no longer
 * pulls in the package for the many callers who never convert a schema. It
 * ships a CJS `require` export condition (checked against its package.json),
 * so require() works on any Node >=22.0.0 — no experimental flag, unlike
 * require(esm) of a local ES module (which only works unflagged from Node
 * >=22.12). Zod itself stays a normal static import: its runtime schemas
 * (`z`, `zodModule`) are public exports used well beyond schema conversion.
 * Follows the pattern in src/lib/proxy/otelLogSink.ts — construction stays
 * one synchronous call, exactly as before; only the *import* is deferred.
 *
 * The reverse direction (JSON Schema → Zod, `convertJsonSchemaToZod`) no
 * longer uses a package at all. It used to run `json-schema-to-zod`'s
 * generated source through `new Function`; the input to that generator is a
 * tool schema a host or a remote MCP server supplies, so the process's safety
 * rested on the generator escaping every string position correctly. The
 * converter below builds the Zod schema directly from the JSON Schema object
 * and never evaluates text.
 *
 * A require() made through createRequire() is invisible to bundlers, so a
 * consumer that bundles the SDK without the package next to the output can
 * no longer resolve it, and listing it as external changes nothing for the
 * same reason: the bundler never sees the call. That must not pass for a
 * schema that simply had no properties: the failure is reported once at error
 * level (the only level shown without NEUROLINK_DEBUG), remembered so later
 * calls neither retry the lookup nor repeat the report, and the caller
 * degrades exactly as it does when a conversion throws. The browser artifact
 * is the one bundle we build ourselves; scripts/build-browser.mjs bundles the
 * package into it and serves it from its `module` stub.
 */
const require = createRequire(import.meta.url);

function lazyPackageFunction<Fn extends (...args: never[]) => unknown>(
  packageName: string,
  exportName: string,
): () => Fn | undefined {
  let attempted = false;
  let resolved: Fn | undefined;
  return () => {
    if (attempted) {
      return resolved;
    }
    attempted = true;
    let failure: string | undefined;
    try {
      const loadedModule: unknown = require(packageName);
      const candidate =
        typeof loadedModule === "object" && loadedModule !== null
          ? Reflect.get(loadedModule, exportName)
          : undefined;
      if (typeof candidate === "function") {
        resolved = candidate as Fn;
      } else {
        failure = `it resolved without a "${exportName}" function`;
      }
    } catch (error) {
      failure = (error instanceof Error ? error.message : String(error)).split(
        "\n",
      )[0];
    }
    if (failure !== undefined) {
      logger.error(
        `[SCHEMA-CONVERSION] Cannot load "${packageName}" (${failure}). Any schema ` +
          `that needs it is replaced with an empty object schema, so the model ` +
          `sees no parameters for it. The SDK loads this package at run time ` +
          `and a bundler cannot see that load, so bundling the SDK does not ` +
          `provide it: install "${packageName}" where @juspay/neurolink can ` +
          `resolve it, next to your bundle if you bundle the SDK.`,
      );
    }
    return resolved;
  };
}

const loadZodToJsonSchema = lazyPackageFunction<typeof ZodToJsonSchemaFn>(
  "zod-to-json-schema",
  "zodToJsonSchema",
);

// Zod 4 ships a built-in `z.toJSONSchema(...)`. Zod 3 does not — it returned
// nothing of the sort and we relied entirely on `zod-to-json-schema`. The
// `zod-to-json-schema` package only understands Zod 3's internal `_def`
// shape, so feeding it a Zod 4 schema yields an empty `{}` (it silently
// produces `definitions: { ToolParameters: {} }`). When this happens
// downstream callers send an empty `responseSchema` to the model and get
// back arbitrary JSON, which is exactly how the Vertex Structured-Output
// regressions surfaced. Detect the Zod 4 helper at module load and prefer
// it for actual Zod schemas.
// Zod 4 spells the OpenAPI target as "openapi-3.0" (with a dot) while the
// third-party zod-to-json-schema package uses "openApi3". Internally we use
// the latter for backwards compatibility with existing call sites; this map
// translates to the dialect Zod 4 actually accepts. The Zod4Native* types
// live in src/lib/types/aliases.ts per project rule 2.
const zodToJsonSchemaV4 =
  typeof (zodModule as { toJSONSchema?: unknown }).toJSONSchema === "function"
    ? ((
        zodModule as {
          toJSONSchema: (schema: unknown, params?: Zod4NativeParams) => unknown;
        }
      ).toJSONSchema as (
        schema: unknown,
        params?: Zod4NativeParams,
      ) => Record<string, unknown>)
    : undefined;

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
  // Use definitions from schema if not provided. Modern MCP servers and
  // zod v4's native toJSONSchema emit the 2020-12 `$defs` keyword; older
  // emitters use draft-07 `definitions`. Support both.
  const defs =
    definitions ||
    ((schema.definitions ?? schema.$defs) as Record<
      string,
      Record<string, unknown>
    >);

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

    // Try simple definition lookup first (#/definitions/SomeName or the
    // 2020-12 #/$defs/SomeName form)
    if (
      refPath.startsWith("#/definitions/") ||
      refPath.startsWith("#/$defs/")
    ) {
      const defName = refPath
        .replace("#/definitions/", "")
        .replace("#/$defs/", "");

      // Check if it's a simple definition name (no slashes after the prefix)
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

    // Unresolved $ref: warn and preserve the original node verbatim. Falling
    // through to the copy loop below would strip the $ref key and silently
    // turn a ref-only node into an empty {}, which broadens validation
    // instead of failing closed.
    logger.warn(`[SCHEMA-INLINE] Could not resolve $ref: ${refPath}`);
    return { ...schema };
  }

  // Create result without $ref and definitions
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // Skip $ref and definition-container keys (both draft-07 and 2020-12)
    if (key === "$ref" || key === "definitions" || key === "$defs") {
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
export function convertZodToJsonSchema(
  // The union mirrors the three documented input shapes: Zod schemas plus
  // plain-object forms (AI SDK `jsonSchema()` wrappers and raw JSON Schema).
  zodSchema: ZodUnknownSchema | Record<string, unknown>,
  // Default to JSON Schema draft-07 so non-Vertex consumers (Bedrock, MCP
  // tool registration, etc.) keep their pre-migration dialect. Vertex/Gemini
  // callers opt into "openApi3" explicitly to get `nullable: true` instead
  // of `anyOf: [..., {type: "null"}]`.
  target: "jsonSchema7" | "openApi3" = "jsonSchema7",
): object {
  const schema = zodSchema as Record<string, unknown>;

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

  // Actual Zod schema — prefer Zod 4's native `z.toJSONSchema` when
  // available (the runtime version of `zod` here is Zod 4), then fall
  // back to `zod-to-json-schema` for Zod 3 schemas that external callers
  // might still pass in.
  //
  // Translate our `target` to Zod 4's native dialect identifier so the
  // openApi3 path emits the OpenAPI 3 schema shape Vertex/Gemini expect
  // (and not the default draft-07 anyOf/null union).
  if (zodToJsonSchemaV4 && isZod4Schema(zodSchema)) {
    const nativeTarget: Zod4NativeTarget =
      target === "openApi3" ? "openapi-3.0" : "draft-07";
    try {
      const native = zodToJsonSchemaV4(zodSchema as unknown, {
        target: nativeTarget,
      });
      // Drop the $schema metadata Vertex/Gemini doesn't need, then walk to
      // backfill any missing nested types (Zod 4's output is already flat
      // — no $defs/$ref by default — but the helper is cheap and matches
      // the Zod 3 path's contract).
      const flat = { ...native };
      delete (flat as Record<string, unknown>).$schema;
      const inlined = inlineJsonSchema(flat);
      return ensureNestedSchemaTypes(ensureTypeField(inlined));
    } catch (error) {
      logger.warn(
        "Native z.toJSONSchema failed; falling back to zod-to-json-schema",
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  // Zod 3 fallback path
  const convertWithZodToJsonSchema = loadZodToJsonSchema();
  if (!convertWithZodToJsonSchema) {
    return { type: "object", properties: {} };
  }
  try {
    // Zod 4→3 boundary: zodToJsonSchema types reference Zod 3's ZodSchema via zod/v3.
    // Runtime compatible — cast through unknown at this third-party boundary only.
    // eslint-disable-next-line no-restricted-syntax -- genuine third-party type-system boundary: zod-to-json-schema's input type is zod/v3's ZodType, structurally incompatible with the Zod 4 schema held here (no overlap, single assertion cannot compile); runtime-compatible fallback contract documented above.
    const zodV3Schema = zodSchema as unknown as ZodToJsonSchemaInput;
    const jsonSchema = convertWithZodToJsonSchema(zodV3Schema, {
      name: "ToolParameters",
      target,
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

/** JSON Schema keys whose values are themselves schemas (single). */
const SCHEMA_VALUE_KEYS = new Set([
  "items",
  "additionalProperties",
  "not",
  "if",
  "then",
  "else",
  "contains",
  "propertyNames",
]);

/** JSON Schema keys whose values are arrays of schemas. */
const SCHEMA_ARRAY_KEYS = new Set(["allOf", "anyOf", "oneOf", "prefixItems"]);

/** JSON Schema keys whose values are name → schema maps. */
const SCHEMA_MAP_KEYS = new Set([
  "properties",
  "patternProperties",
  "$defs",
  "definitions",
]);

/**
 * Annotation keys that carry no validation semantics for a model and that
 * generic OpenAI-compatible backends (vllm, GLM/Qwen chat templates, local
 * servers) may render into the prompt verbatim, confusing argument
 * generation. Removed only at SCHEMA positions — never inside data values
 * like `default`, `const`, `enum` or `examples`, where `$id` etc. are
 * legitimate payload.
 */
const SCHEMA_ANNOTATION_KEYS = new Set(["$schema", "$id", "$comment"]);

/** Walk schema positions only, dropping annotation-only keys. */
function stripSchemaAnnotations(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (SCHEMA_ANNOTATION_KEYS.has(key)) {
      continue;
    }
    if (
      SCHEMA_VALUE_KEYS.has(key) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      result[key] = stripSchemaAnnotations(value as Record<string, unknown>);
    } else if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? stripSchemaAnnotations(item as Record<string, unknown>)
          : item,
      );
    } else if (
      SCHEMA_MAP_KEYS.has(key) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const map: Record<string, unknown> = {};
      for (const [name, sub] of Object.entries(
        value as Record<string, unknown>,
      )) {
        map[name] =
          sub && typeof sub === "object" && !Array.isArray(sub)
            ? stripSchemaAnnotations(sub as Record<string, unknown>)
            : sub;
      }
      result[key] = map;
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Collapse the zod-emitted nullable pattern `anyOf/oneOf: [T, {type:"null"}]`
 * into `{...T, type: [t, "null"]}`. Weaker OSS models handle a plain type
 * array far better than composition keywords when choosing tool arguments.
 * Conservative: only fires for exactly-two variants where the non-null
 * variant has a primitive `type` string — everything else passes through.
 */
function collapseNullableVariants(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (
      SCHEMA_VALUE_KEYS.has(key) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      result[key] = collapseNullableVariants(value as Record<string, unknown>);
    } else if (SCHEMA_ARRAY_KEYS.has(key) && Array.isArray(value)) {
      result[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? collapseNullableVariants(item as Record<string, unknown>)
          : item,
      );
    } else if (
      SCHEMA_MAP_KEYS.has(key) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      const map: Record<string, unknown> = {};
      for (const [name, sub] of Object.entries(
        value as Record<string, unknown>,
      )) {
        map[name] =
          sub && typeof sub === "object" && !Array.isArray(sub)
            ? collapseNullableVariants(sub as Record<string, unknown>)
            : sub;
      }
      result[key] = map;
    } else {
      result[key] = value;
    }
  }

  for (const compositionKey of ["anyOf", "oneOf"] as const) {
    const variants = result[compositionKey];
    if (!Array.isArray(variants) || variants.length !== 2) {
      continue;
    }
    const isNullVariant = (v: unknown): boolean =>
      !!v &&
      typeof v === "object" &&
      (v as Record<string, unknown>).type === "null";
    const nullIndex = variants.findIndex(isNullVariant);
    if (nullIndex === -1) {
      continue;
    }
    const other = variants[1 - nullIndex] as Record<string, unknown>;
    if (
      !other ||
      typeof other !== "object" ||
      Array.isArray(other) ||
      typeof other.type !== "string" ||
      other.type === "null"
    ) {
      continue;
    }
    // Merge: variant content + outer annotations (description etc.) win.
    const { [compositionKey]: _dropped, ...outer } = result;
    return { ...other, ...outer, type: [other.type, "null"] };
  }
  return result;
}

/**
 * Normalize a JSON Schema for the OpenAI chat-completions `tools` wire
 * block. Generic proxied backends (LiteLLM → vllm/GLM/Qwen, local servers)
 * render tool schemas into chat templates more or less verbatim, so `$ref`
 * indirection, `$defs` containers, `$schema` annotations, and zod's
 * nullable `anyOf` pattern all measurably degrade argument generation —
 * this is the parity gap behind "the model can't find the right arguments"
 * on litellm while the same tools work on Gemini/Claude native paths
 * (which sanitize schemas before the wire).
 *
 * Pipeline: strip annotation keys → inline local `$ref`/`$defs`/
 * `definitions` → collapse nullable variants → guarantee a top-level object
 * shape. Identity for already-clean schemas; `description`, `required`,
 * `enum`, and `default` — what models actually read — are always preserved.
 */
export function normalizeWireToolSchema(
  schema: unknown,
): Record<string, unknown> {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
    return { type: "object", properties: {} };
  }
  return ensureTypeField(
    collapseNullableVariants(
      inlineJsonSchema(
        stripSchemaAnnotations(schema as Record<string, unknown>),
      ),
    ),
  );
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
 * Whether a schema was built by Zod 4 specifically.
 *
 * Zod 4 hangs its internals off `_zod` (and `z.toJSONSchema` reads
 * `schema._zod.def`); Zod 3 has only `_def`. The two can coexist in one install
 * — a host on Zod 3 still resolves NeuroLink's own Zod 4 — so the presence of
 * `z.toJSONSchema` says nothing about the schema actually being handed to it.
 */
export function isZod4Schema(value: unknown): boolean {
  return !!(value && typeof value === "object" && "_zod" in value);
}

// ---------------------------------------------------------------------------
// JSON Schema → Zod, without evaluating generated code
// ---------------------------------------------------------------------------

/** Deepest JSON Schema nesting the converter follows before giving up. */
const MAX_JSON_SCHEMA_DEPTH = 32;

/**
 * Property names that must never become keys of a Zod object shape. Building a
 * shape with `shape[name] = schema` for `__proto__` would replace the shape's
 * prototype instead of adding a property, and Zod reads the shape by its keys.
 * A tool whose argument is literally called `__proto__` is hostile, not real.
 */
const FORBIDDEN_PROPERTY_NAMES: ReadonlySet<string> = new Set([
  "__proto__",
  "constructor",
  "prototype",
]);

function isSchemaConversionNode(value: unknown): value is SchemaConversionNode {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isLiteralValue(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

/**
 * Resolve a local `#/definitions/x` or `#/$defs/x` pointer against the root.
 * Anything else — a remote `$ref`, a pointer into an unknown place — resolves
 * to `undefined` and the caller falls back to `z.unknown()`.
 */
function resolveLocalRef(
  ref: string,
  root: SchemaConversionNode,
): SchemaConversionNode | undefined {
  if (!ref.startsWith("#/")) {
    return undefined;
  }
  const segments = ref
    .slice(2)
    .split("/")
    .map((segment) => segment.replace(/~1/g, "/").replace(/~0/g, "~"));
  let current: unknown = root;
  for (const segment of segments) {
    if (
      !isSchemaConversionNode(current) ||
      FORBIDDEN_PROPERTY_NAMES.has(segment)
    ) {
      return undefined;
    }
    if (!Object.prototype.hasOwnProperty.call(current, segment)) {
      return undefined;
    }
    current = current[segment];
  }
  return isSchemaConversionNode(current) ? current : undefined;
}

function literalSchema(
  value: string | number | boolean | null,
): ZodUnknownSchema {
  return value === null ? z.null() : z.literal(value);
}

function unionOf(members: ZodUnknownSchema[]): ZodUnknownSchema {
  if (members.length === 0) {
    return z.unknown();
  }
  if (members.length === 1) {
    return members[0];
  }
  return z.union(
    members as [ZodUnknownSchema, ZodUnknownSchema, ...ZodUnknownSchema[]],
  );
}

function convertStringSchema(
  schema: SchemaConversionNode,
  path: string,
  context: SchemaConversionContext,
): ZodUnknownSchema {
  let result = z.string();
  if (typeof schema.minLength === "number" && schema.minLength >= 0) {
    result = result.min(Math.floor(schema.minLength));
  }
  if (typeof schema.maxLength === "number" && schema.maxLength >= 0) {
    result = result.max(Math.floor(schema.maxLength));
  }
  if (typeof schema.pattern === "string") {
    const verdict = vetRegexPattern(schema.pattern);
    if (verdict.safe) {
      try {
        result = result.regex(new RegExp(schema.pattern, "u"));
      } catch {
        context.onRegexDrop({
          path: `${path}/pattern`,
          pattern: schema.pattern,
          reason: "the pattern is not a valid regular expression",
        });
      }
    } else {
      context.onRegexDrop({
        path: `${path}/pattern`,
        pattern: schema.pattern,
        reason: verdict.reason,
      });
    }
  }
  return result;
}

function convertNumberSchema(
  schema: SchemaConversionNode,
  integer: boolean,
): ZodUnknownSchema {
  let result = integer ? z.number().int() : z.number();
  if (typeof schema.minimum === "number") {
    result = result.min(schema.minimum);
  }
  if (typeof schema.maximum === "number") {
    result = result.max(schema.maximum);
  }
  if (typeof schema.exclusiveMinimum === "number") {
    result = result.gt(schema.exclusiveMinimum);
  }
  if (typeof schema.exclusiveMaximum === "number") {
    result = result.lt(schema.exclusiveMaximum);
  }
  if (typeof schema.multipleOf === "number" && schema.multipleOf > 0) {
    result = result.multipleOf(schema.multipleOf);
  }
  return result;
}

function convertArraySchema(
  schema: SchemaConversionNode,
  path: string,
  context: SchemaConversionContext,
  depth: number,
): ZodUnknownSchema {
  if (Array.isArray(schema.items)) {
    const members = schema.items.map((item, index) =>
      convertSchemaNode(item, `${path}/items/${index}`, context, depth + 1),
    );
    if (members.length === 0) {
      return z.tuple([]);
    }
    return z.tuple(members as [ZodUnknownSchema, ...ZodUnknownSchema[]]);
  }
  const itemSchema =
    schema.items === undefined
      ? z.unknown()
      : convertSchemaNode(schema.items, `${path}/items`, context, depth + 1);
  let result = z.array(itemSchema);
  if (typeof schema.minItems === "number" && schema.minItems >= 0) {
    result = result.min(Math.floor(schema.minItems));
  }
  if (typeof schema.maxItems === "number" && schema.maxItems >= 0) {
    result = result.max(Math.floor(schema.maxItems));
  }
  return result;
}

function convertObjectSchema(
  schema: SchemaConversionNode,
  path: string,
  context: SchemaConversionContext,
  depth: number,
): ZodUnknownSchema {
  const required = new Set<string>(
    Array.isArray(schema.required)
      ? schema.required.filter(
          (name): name is string => typeof name === "string",
        )
      : [],
  );
  const shape: Record<string, ZodUnknownSchema> = {};
  if (isSchemaConversionNode(schema.properties)) {
    for (const [name, propertySchema] of Object.entries(schema.properties)) {
      if (FORBIDDEN_PROPERTY_NAMES.has(name)) {
        logger.debug(
          `[SCHEMA-CONVERSION] Dropped property "${name}" at ${path}: the name is reserved`,
        );
        continue;
      }
      const converted = convertSchemaNode(
        propertySchema,
        `${path}/properties/${name}`,
        context,
        depth + 1,
      );
      shape[name] = required.has(name) ? converted : converted.optional();
    }
  }
  const base = z.object(shape);
  const additional = schema.additionalProperties;
  if (additional === false) {
    return base.strict();
  }
  if (additional === true) {
    return base.passthrough();
  }
  if (isSchemaConversionNode(additional)) {
    return base.catchall(
      convertSchemaNode(
        additional,
        `${path}/additionalProperties`,
        context,
        depth + 1,
      ),
    );
  }
  return base;
}

function convertTypedSchema(
  type: string,
  schema: SchemaConversionNode,
  path: string,
  context: SchemaConversionContext,
  depth: number,
): ZodUnknownSchema {
  switch (type) {
    case "string":
      return convertStringSchema(schema, path, context);
    case "number":
      return convertNumberSchema(schema, false);
    case "integer":
      return convertNumberSchema(schema, true);
    case "boolean":
      return z.boolean();
    case "null":
      return z.null();
    case "array":
      return convertArraySchema(schema, path, context, depth);
    case "object":
      return convertObjectSchema(schema, path, context, depth);
    default:
      return z.unknown();
  }
}

function convertSchemaNode(
  node: unknown,
  path: string,
  context: SchemaConversionContext,
  depth: number,
): ZodUnknownSchema {
  if (node === true || node === undefined) {
    return z.unknown();
  }
  if (node === false) {
    return z.never();
  }
  if (!isSchemaConversionNode(node)) {
    return z.unknown();
  }
  if (depth > MAX_JSON_SCHEMA_DEPTH) {
    logger.debug(
      `[SCHEMA-CONVERSION] Schema at ${path} nests deeper than ${MAX_JSON_SCHEMA_DEPTH}; accepting any value there`,
    );
    return z.unknown();
  }

  let result: ZodUnknownSchema;

  if (typeof node.$ref === "string") {
    const target = resolveLocalRef(node.$ref, context.root);
    if (target === undefined || context.refStack.has(node.$ref)) {
      result = z.unknown();
    } else {
      context.refStack.add(node.$ref);
      try {
        result = convertSchemaNode(target, path, context, depth + 1);
      } finally {
        context.refStack.delete(node.$ref);
      }
    }
  } else if (Array.isArray(node.enum)) {
    const literals = node.enum.filter(isLiteralValue);
    const allStrings =
      literals.length > 0 &&
      literals.length === node.enum.length &&
      literals.every((value) => typeof value === "string");
    result = allStrings
      ? z.enum(literals as [string, ...string[]])
      : unionOf(
          literals
            .map(literalSchema)
            .concat(literals.length === node.enum.length ? [] : [z.unknown()]),
        );
  } else if ("const" in node) {
    result = isLiteralValue(node.const)
      ? literalSchema(node.const)
      : z.unknown();
  } else if (Array.isArray(node.anyOf) || Array.isArray(node.oneOf)) {
    const options = (node.anyOf ?? node.oneOf) as unknown[];
    const keyword = Array.isArray(node.anyOf) ? "anyOf" : "oneOf";
    result = unionOf(
      options.map((option, index) =>
        convertSchemaNode(
          option,
          `${path}/${keyword}/${index}`,
          context,
          depth + 1,
        ),
      ),
    );
  } else if (Array.isArray(node.allOf)) {
    const parts = node.allOf.map((part, index) =>
      convertSchemaNode(part, `${path}/allOf/${index}`, context, depth + 1),
    );
    result =
      parts.length === 0
        ? z.unknown()
        : parts.reduce((left, right) => z.intersection(left, right));
  } else if (Array.isArray(node.type)) {
    const types = node.type.filter(
      (entry): entry is string => typeof entry === "string",
    );
    result = unionOf(
      types.map((type) => convertTypedSchema(type, node, path, context, depth)),
    );
  } else if (typeof node.type === "string") {
    result = convertTypedSchema(node.type, node, path, context, depth);
  } else if (isSchemaConversionNode(node.properties)) {
    result = convertObjectSchema(node, path, context, depth);
  } else if (node.items !== undefined) {
    result = convertArraySchema(node, path, context, depth);
  } else {
    result = z.unknown();
  }

  if (node.nullable === true) {
    result = result.nullable();
  }
  if (typeof node.description === "string") {
    result = result.describe(node.description);
  }
  if ("default" in node && node.default !== undefined) {
    result = result.default(node.default);
  }
  return result;
}

/**
 * Convert a JSON Schema object to a Zod schema.
 *
 * Built directly from the schema object — no generated source, no
 * `new Function` — so a hostile `description`, `pattern`, `default`, `const`,
 * `enum` or property name is data, never code. Covers the subset tool
 * schemas use: object/array/string/number/integer/boolean/null, `enum`,
 * `const`, `anyOf`/`oneOf`/`allOf`, type unions, local `$ref`s, `nullable`,
 * `required`, `additionalProperties`, `description`, `default` and the common
 * length/range bounds. A `pattern` is compiled only after `vetRegexPattern`
 * accepts it; a pattern that could stall the process is dropped from the
 * schema and reported once at warn level. Unknown constructs validate as
 * `unknown` rather than failing the conversion.
 *
 * Returns `z.object({}).passthrough()` for input that is not a schema object,
 * exactly as the previous implementation did on any failure.
 */
export function convertJsonSchemaToZod(
  jsonSchema: Record<string, unknown>,
): ZodUnknownSchema {
  const startTime = Date.now();

  if (!isSchemaConversionNode(jsonSchema)) {
    logger.debug(
      "🔍 [SCHEMA-CONVERSION] Invalid or empty JSON schema, using fallback",
    );
    return z.object({}).passthrough();
  }

  const drops: SchemaRegexDrop[] = [];
  try {
    const zodSchema = convertSchemaNode(
      jsonSchema,
      "#",
      {
        root: jsonSchema,
        refStack: new Set<string>(),
        onRegexDrop: (drop) => drops.push(drop),
      },
      0,
    );

    if (drops.length > 0) {
      logger.warn(
        `[SCHEMA-CONVERSION] Dropped ${drops.length} regular expression pattern(s) that could stall the process; the affected fields validate without them`,
        {
          drops: drops.map(({ path, reason }) => ({ path, reason })),
        },
      );
    }

    logger.debug("🔍 [SCHEMA-CONVERSION] ===== CONVERSION SUCCESSFUL =====", {
      inputType: jsonSchema.type,
      propertiesCount: isSchemaConversionNode(jsonSchema.properties)
        ? Object.keys(jsonSchema.properties).length
        : 0,
      requiredCount: Array.isArray(jsonSchema.required)
        ? jsonSchema.required.length
        : 0,
      droppedPatterns: drops.length,
      conversionTimeMs: Date.now() - startTime,
    });

    return zodSchema;
  } catch (error) {
    logger.warn(
      "🚨 [SCHEMA-CONVERSION] JSON Schema conversion failed, using passthrough fallback",
      {
        error: error instanceof Error ? error.message : String(error),
        errorType:
          error instanceof Error ? error.constructor.name : typeof error,
        inputSchemaType: jsonSchema.type,
        inputSchemaKeys: Object.keys(jsonSchema),
        conversionTimeMs: Date.now() - startTime,
      },
    );

    return z.object({}).passthrough();
  }
}

/**
 * Keys whose string value is a regular expression source in JSON Schema.
 * `patternProperties` is handled separately: there the KEYS are the patterns.
 */
const REGEX_VALUED_KEYWORDS: ReadonlySet<string> = new Set(["pattern"]);

function collectUnsafePatterns(
  node: unknown,
  path: string,
  depth: number,
  drops: SchemaRegexDrop[],
): void {
  if (
    depth > MAX_JSON_SCHEMA_DEPTH ||
    node === null ||
    typeof node !== "object"
  ) {
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((item, index) =>
      collectUnsafePatterns(item, `${path}/${index}`, depth + 1, drops),
    );
    return;
  }
  for (const [key, value] of Object.entries(node as SchemaConversionNode)) {
    if (REGEX_VALUED_KEYWORDS.has(key) && typeof value === "string") {
      const verdict = vetRegexPattern(value);
      if (!verdict.safe) {
        drops.push({
          path: `${path}/${key}`,
          pattern: value,
          reason: verdict.reason,
        });
      }
      continue;
    }
    if (key === "patternProperties" && isSchemaConversionNode(value)) {
      for (const [pattern, subSchema] of Object.entries(value)) {
        const verdict = vetRegexPattern(pattern);
        if (!verdict.safe) {
          drops.push({
            path: `${path}/patternProperties/${pattern}`,
            pattern,
            reason: verdict.reason,
          });
        }
        collectUnsafePatterns(
          subSchema,
          `${path}/patternProperties/${pattern}`,
          depth + 1,
          drops,
        );
      }
      continue;
    }
    collectUnsafePatterns(value, `${path}/${key}`, depth + 1, drops);
  }
}

function removeUnsafePatterns(
  node: unknown,
  unsafe: ReadonlySet<string>,
  path: string,
  depth: number,
): unknown {
  if (
    depth > MAX_JSON_SCHEMA_DEPTH ||
    node === null ||
    typeof node !== "object"
  ) {
    return node;
  }
  if (Array.isArray(node)) {
    return node.map((item, index) =>
      removeUnsafePatterns(item, unsafe, `${path}/${index}`, depth + 1),
    );
  }
  const out: SchemaConversionNode = {};
  for (const [key, value] of Object.entries(node as SchemaConversionNode)) {
    if (REGEX_VALUED_KEYWORDS.has(key) && typeof value === "string") {
      if (unsafe.has(`${path}/${key}`)) {
        continue;
      }
      Object.defineProperty(out, key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      continue;
    }
    if (key === "patternProperties" && isSchemaConversionNode(value)) {
      const kept: SchemaConversionNode = {};
      for (const [pattern, subSchema] of Object.entries(value)) {
        const subPath = `${path}/patternProperties/${pattern}`;
        if (unsafe.has(subPath)) {
          continue;
        }
        Object.defineProperty(kept, pattern, {
          value: removeUnsafePatterns(subSchema, unsafe, subPath, depth + 1),
          enumerable: true,
          writable: true,
          configurable: true,
        });
      }
      Object.defineProperty(out, key, {
        value: kept,
        enumerable: true,
        writable: true,
        configurable: true,
      });
      continue;
    }
    Object.defineProperty(out, key, {
      value: removeUnsafePatterns(value, unsafe, `${path}/${key}`, depth + 1),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return out;
}

/**
 * Remove from a JSON Schema every `pattern` and every `patternProperties` key
 * that `vetRegexPattern` refuses, so a validator built from the result (the
 * `@cfworker/json-schema` validator compiles each with `new RegExp` on every
 * check) cannot be stalled by a schema a remote server chose.
 *
 * Returns the input object itself when nothing had to be removed, so the
 * common case costs one walk and no allocation. Otherwise a deep copy with the
 * offending keywords left out, and `drops` names each one. Never throws.
 */
export function stripUnsafeRegexPatterns(schema: Record<string, unknown>): {
  schema: Record<string, unknown>;
  drops: SchemaRegexDrop[];
} {
  const drops: SchemaRegexDrop[] = [];
  try {
    collectUnsafePatterns(schema, "#", 0, drops);
    if (drops.length === 0) {
      return { schema, drops };
    }
    const unsafe = new Set(drops.map((drop) => drop.path));
    const stripped = removeUnsafePatterns(schema, unsafe, "#", 0);
    return {
      schema: isSchemaConversionNode(stripped) ? stripped : schema,
      drops,
    };
  } catch {
    return { schema, drops };
  }
}
