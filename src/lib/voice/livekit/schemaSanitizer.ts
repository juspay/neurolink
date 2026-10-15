/**
 * Gemini function-calling schema sanitizer.
 *
 * Normalises an MCP tool's JSON Schema into the subset Gemini's function-calling
 * accepts. `@google/genai`'s processJsonSchema crashes on untyped nodes,
 * `$ref`/`$defs`, and some `anyOf`/`oneOf` shapes, so we rebuild a clean tree:
 * every node gets a concrete `type`, unions collapse to their first concrete
 * branch, and unsupported keywords are dropped.
 *
 * Pure, dependency-free, and assertion-free — values arrive as `unknown` and are
 * narrowed with the `isRecord` guard. Safe to reuse for any Gemini tool path.
 * The xai realtime backend uses it too: the output is plain JSON Schema, and
 * keeping it avoids sending xAI `$ref` or union shapes it has not been tried with.
 */

const GEMINI_TYPES = new Set([
  "string",
  "number",
  "integer",
  "boolean",
  "array",
  "object",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The first concrete (non-`"null"`-typed) branch of an `anyOf`/`oneOf`/`allOf`
 * union, or `undefined` when there is no union to collapse.
 */
function firstConcreteUnionBranch(
  schema: Record<string, unknown>,
): unknown | undefined {
  const union = schema.anyOf ?? schema.oneOf ?? schema.allOf;
  if (!Array.isArray(union)) {
    return undefined;
  }
  return union.find((branch) => isRecord(branch) && branch.type !== "null");
}

function resolveSchemaType(schema: Record<string, unknown>): string {
  if (typeof schema.type === "string") {
    return GEMINI_TYPES.has(schema.type) ? schema.type : "string";
  }
  if (Array.isArray(schema.type)) {
    const named = schema.type.find(
      (entry): entry is string => typeof entry === "string" && entry !== "null",
    );
    if (named !== undefined && GEMINI_TYPES.has(named)) {
      return named;
    }
  }
  if (isRecord(schema.properties)) {
    return "object";
  }
  if (schema.items !== undefined) {
    return "array";
  }
  return "string";
}

function sanitizeObjectMembers(
  schema: Record<string, unknown>,
  out: Record<string, unknown>,
): void {
  const properties = isRecord(schema.properties) ? schema.properties : {};
  const sanitizedProperties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties)) {
    sanitizedProperties[key] = sanitizeSchema(value);
  }
  out.properties = sanitizedProperties;
  if (Array.isArray(schema.required)) {
    out.required = schema.required.filter(
      (name) => typeof name === "string" && name in sanitizedProperties,
    );
  }
  if (Object.keys(sanitizedProperties).length === 0) {
    out.additionalProperties = true;
  }
}

/**
 * Rebuild a JSON Schema node into the Gemini-safe subset. Returns a fresh object
 * with a concrete `type` on every node.
 */
export function sanitizeSchema(node: unknown): Record<string, unknown> {
  if (!isRecord(node)) {
    return { type: "string" };
  }
  const out: Record<string, unknown> = {};
  if (typeof node.description === "string") {
    out.description = node.description;
  }

  if (typeof node.type !== "string") {
    const branch = firstConcreteUnionBranch(node);
    if (branch !== undefined) {
      const merged = sanitizeSchema(branch);
      return out.description
        ? { ...merged, description: out.description }
        : merged;
    }
  }

  const type = resolveSchemaType(node);
  out.type = type;

  if (Array.isArray(node.enum)) {
    out.enum = node.enum;
  }
  if (type === "object") {
    sanitizeObjectMembers(node, out);
  }
  if (type === "array") {
    out.items = sanitizeSchema(node.items);
  }
  return out;
}

/** Tool parameters must be an object schema; force it and sanitize the tree. */
export function sanitizeToolParameters(
  schema: unknown,
): Record<string, unknown> {
  const sanitized = sanitizeSchema(schema ?? {});
  if (sanitized.type !== "object") {
    return { type: "object", properties: {}, additionalProperties: true };
  }
  return sanitized;
}

/**
 * Walk a (sanitized) schema and return the first node the google plugin would
 * turn into `undefined` — which genai then crashes on. Returns a human-readable
 * path/reason, or `null` if the schema is safe. After `sanitizeSchema` this
 * should always be `null`; if not, it names the exact offending path.
 */
export function findSchemaIssue(
  node: unknown,
  pathPrefix = "$",
): string | null {
  if (!isRecord(node)) {
    return `${pathPrefix}: not an object schema`;
  }
  if (typeof node.type !== "string") {
    return `${pathPrefix}: missing string "type"`;
  }
  if (node.type === "object") {
    const properties = isRecord(node.properties) ? node.properties : undefined;
    const isEmpty =
      properties === undefined || Object.keys(properties).length === 0;
    if (
      isEmpty &&
      (node.additionalProperties === undefined ||
        node.additionalProperties === null)
    ) {
      return `${pathPrefix}: empty object schema without additionalProperties (plugin → undefined)`;
    }
    if (properties !== undefined) {
      for (const [key, value] of Object.entries(properties)) {
        const childIssue = findSchemaIssue(value, `${pathPrefix}.${key}`);
        if (childIssue) {
          return childIssue;
        }
      }
    }
  }
  if (node.type === "array") {
    return findSchemaIssue(node.items, `${pathPrefix}[]`);
  }
  return null;
}
