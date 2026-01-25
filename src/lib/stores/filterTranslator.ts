/**
 * Filter translation utilities for converting NeuroLink's unified filter DSL
 * to provider-specific formats
 */

import type {
  FieldFilter,
  MetadataFilter,
} from "../types/vectorFilterTypes.js";
import { isFieldFilter } from "../types/vectorFilterTypes.js";

/**
 * Translate abstract filter to Pinecone format
 * @see https://docs.pinecone.io/docs/metadata-filtering
 */
export function translateToPinecone(
  filter: MetadataFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      result["$and"] = (value as MetadataFilter[]).map(translateToPinecone);
    } else if (key === "$or") {
      result["$or"] = (value as MetadataFilter[]).map(translateToPinecone);
    } else if (key === "$not") {
      // Pinecone doesn't have $not, need to transform to $ne
      const inner = translateToPinecone(value as MetadataFilter);
      for (const [k, v] of Object.entries(inner)) {
        if (typeof v === "object" && v !== null && "$eq" in v) {
          result[k] = { $ne: (v as Record<string, unknown>)["$eq"] };
        } else {
          result[k] = { $ne: v };
        }
      }
    } else if (isFieldFilter(value)) {
      result[key] = translatePineconeFieldFilter(value as FieldFilter);
    } else {
      result[key] = { $eq: value };
    }
  }

  return result;
}

/**
 * Translate field filter to Pinecone format
 */
function translatePineconeFieldFilter(
  filter: FieldFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
      case "$ne":
      case "$gt":
      case "$gte":
      case "$lt":
      case "$lte":
      case "$in":
      case "$nin":
        result[op] = val;
        break;
      case "$contains":
        // Pinecone doesn't support contains directly, fall back to $eq
        result["$eq"] = val;
        break;
      default:
        result[op] = val;
    }
  }
  return result;
}

/**
 * Translate abstract filter to Qdrant format
 * @see https://qdrant.tech/documentation/concepts/filtering/
 */
export function translateToQdrant(
  filter: MetadataFilter,
): Record<string, unknown> {
  const conditions: unknown[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const andConditions = (value as MetadataFilter[]).map(translateToQdrant);
      conditions.push({
        must: andConditions,
      });
    } else if (key === "$or") {
      const orConditions = (value as MetadataFilter[]).map(translateToQdrant);
      conditions.push({
        should: orConditions,
        min_should_match: 1,
      });
    } else if (key === "$not") {
      conditions.push({
        must_not: [translateToQdrant(value as MetadataFilter)],
      });
    } else if (isFieldFilter(value)) {
      conditions.push(translateQdrantFieldFilter(key, value as FieldFilter));
    } else {
      // Simple equality
      conditions.push({
        key,
        match: { value },
      });
    }
  }

  // Return single condition or wrap in must
  if (conditions.length === 1) {
    return conditions[0] as Record<string, unknown>;
  }
  return { must: conditions };
}

/**
 * Translate field filter to Qdrant format
 */
function translateQdrantFieldFilter(
  key: string,
  filter: FieldFilter,
): Record<string, unknown> {
  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        return { key, match: { value: val } };
      case "$ne":
        return {
          must_not: [{ key, match: { value: val } }],
        };
      case "$gt":
        return { key, range: { gt: val } };
      case "$gte":
        return { key, range: { gte: val } };
      case "$lt":
        return { key, range: { lt: val } };
      case "$lte":
        return { key, range: { lte: val } };
      case "$in":
        return { key, match: { any: val } };
      case "$nin":
        return {
          must_not: [{ key, match: { any: val } }],
        };
      case "$contains":
        return { key, match: { text: val } };
      default:
        return { key, match: { value: val } };
    }
  }
  return {};
}

/**
 * Result type for pgvector filter translation
 */
export type PgvectorFilterResult = {
  sql: string;
  params: unknown[];
  nextIndex: number;
};

/**
 * Translate abstract filter to pgvector/SQL format
 * @param filter The metadata filter to translate
 * @param paramIndex Starting parameter index for parameterized queries
 */
export function translateToPgvector(
  filter: MetadataFilter,
  paramIndex: number = 1,
): PgvectorFilterResult {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let currentIndex = paramIndex;

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToPgvector(f, currentIndex);
        currentIndex = result.nextIndex;
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(subConditions.join(" AND "));
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToPgvector(f, currentIndex);
        currentIndex = result.nextIndex;
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(`(${subConditions.join(" OR ")})`);
    } else if (key === "$not") {
      const result = translateToPgvector(value as MetadataFilter, currentIndex);
      currentIndex = result.nextIndex;
      params.push(...result.params);
      conditions.push(`NOT (${result.sql})`);
    } else if (isFieldFilter(value)) {
      const { sql, param, newIndex } = translatePgFieldFilter(
        key,
        value as FieldFilter,
        currentIndex,
      );
      conditions.push(sql);
      params.push(...param);
      currentIndex = newIndex;
    } else {
      // Simple equality - handle different value types
      if (typeof value === "string") {
        conditions.push(`metadata->>'${sanitizeKey(key)}' = $${currentIndex}`);
        params.push(value);
      } else if (typeof value === "number") {
        conditions.push(
          `(metadata->>'${sanitizeKey(key)}')::numeric = $${currentIndex}`,
        );
        params.push(value);
      } else if (typeof value === "boolean") {
        conditions.push(
          `(metadata->>'${sanitizeKey(key)}')::boolean = $${currentIndex}`,
        );
        params.push(value);
      } else {
        conditions.push(`metadata->>'${sanitizeKey(key)}' = $${currentIndex}`);
        params.push(String(value));
      }
      currentIndex++;
    }
  }

  return {
    sql: conditions.length > 0 ? conditions.join(" AND ") : "TRUE",
    params,
    nextIndex: currentIndex,
  };
}

/**
 * Translate pgvector field filter
 */
function translatePgFieldFilter(
  key: string,
  filter: FieldFilter,
  paramIndex: number,
): { sql: string; param: unknown[]; newIndex: number } {
  const safeKey = sanitizeKey(key);
  const index = paramIndex;

  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        return {
          sql: `metadata->>'${safeKey}' = $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$ne":
        return {
          sql: `metadata->>'${safeKey}' != $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$gt":
        return {
          sql: `(metadata->>'${safeKey}')::numeric > $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$gte":
        return {
          sql: `(metadata->>'${safeKey}')::numeric >= $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$lt":
        return {
          sql: `(metadata->>'${safeKey}')::numeric < $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$lte":
        return {
          sql: `(metadata->>'${safeKey}')::numeric <= $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$in":
        return {
          sql: `metadata->>'${safeKey}' = ANY($${index})`,
          param: [val],
          newIndex: index + 1,
        };
      case "$nin":
        return {
          sql: `metadata->>'${safeKey}' != ALL($${index})`,
          param: [val],
          newIndex: index + 1,
        };
      case "$contains":
        return {
          sql: `metadata->>'${safeKey}' ILIKE $${index}`,
          param: [`%${val}%`],
          newIndex: index + 1,
        };
      case "$startsWith":
        return {
          sql: `metadata->>'${safeKey}' ILIKE $${index}`,
          param: [`${val}%`],
          newIndex: index + 1,
        };
      case "$endsWith":
        return {
          sql: `metadata->>'${safeKey}' ILIKE $${index}`,
          param: [`%${val}`],
          newIndex: index + 1,
        };
      case "$exists":
        if (val) {
          return {
            sql: `metadata ? '${safeKey}'`,
            param: [],
            newIndex: index,
          };
        } else {
          return {
            sql: `NOT (metadata ? '${safeKey}')`,
            param: [],
            newIndex: index,
          };
        }
      default:
        return {
          sql: `metadata->>'${safeKey}' = $${index}`,
          param: [val],
          newIndex: index + 1,
        };
    }
  }

  return { sql: "TRUE", param: [], newIndex: index };
}

/**
 * Translate abstract filter to Chroma format
 * @see https://docs.trychroma.com/usage-guide#using-where-filters
 */
export function translateToChroma(
  filter: MetadataFilter,
): Record<string, unknown> {
  const chromaFilter: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      chromaFilter["$and"] = (value as MetadataFilter[]).map(translateToChroma);
    } else if (key === "$or") {
      chromaFilter["$or"] = (value as MetadataFilter[]).map(translateToChroma);
    } else if (key === "$not") {
      // Chroma doesn't have $not, wrap in $and with negated conditions
      const inner = translateToChroma(value as MetadataFilter);
      for (const [k, v] of Object.entries(inner)) {
        if (typeof v === "object" && v !== null && "$eq" in v) {
          chromaFilter[k] = { $ne: (v as Record<string, unknown>)["$eq"] };
        } else {
          chromaFilter[k] = { $ne: v };
        }
      }
    } else if (isFieldFilter(value)) {
      chromaFilter[key] = translateChromaFieldFilter(value as FieldFilter);
    } else {
      chromaFilter[key] = { $eq: value };
    }
  }

  return chromaFilter;
}

/**
 * Translate field filter to Chroma format
 */
function translateChromaFieldFilter(
  filter: FieldFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
      case "$ne":
      case "$gt":
      case "$gte":
      case "$lt":
      case "$lte":
      case "$in":
      case "$nin":
        result[op] = val;
        break;
      case "$contains":
        result["$contains"] = val;
        break;
      default:
        result[op] = val;
    }
  }
  return result;
}

/**
 * Translate abstract filter to Weaviate format
 * @see https://weaviate.io/developers/weaviate/api/graphql/filters
 */
export function translateToWeaviate(
  filter: MetadataFilter,
): Record<string, unknown> {
  const operands: unknown[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      return {
        operator: "And",
        operands: (value as MetadataFilter[]).map(translateToWeaviate),
      };
    } else if (key === "$or") {
      return {
        operator: "Or",
        operands: (value as MetadataFilter[]).map(translateToWeaviate),
      };
    } else if (key === "$not") {
      return {
        operator: "Not",
        operands: [translateToWeaviate(value as MetadataFilter)],
      };
    } else if (isFieldFilter(value)) {
      operands.push(translateWeaviateFieldFilter(key, value as FieldFilter));
    } else {
      operands.push({
        path: [key],
        operator: "Equal",
        valueString: String(value),
      });
    }
  }

  if (operands.length === 1) {
    return operands[0] as Record<string, unknown>;
  }
  return {
    operator: "And",
    operands,
  };
}

/**
 * Translate field filter to Weaviate format
 */
function translateWeaviateFieldFilter(
  key: string,
  filter: FieldFilter,
): Record<string, unknown> {
  for (const [op, val] of Object.entries(filter)) {
    const valueKey = getWeaviateValueKey(val);
    switch (op) {
      case "$eq":
        return { path: [key], operator: "Equal", [valueKey]: val };
      case "$ne":
        return { path: [key], operator: "NotEqual", [valueKey]: val };
      case "$gt":
        return { path: [key], operator: "GreaterThan", [valueKey]: val };
      case "$gte":
        return { path: [key], operator: "GreaterThanEqual", [valueKey]: val };
      case "$lt":
        return { path: [key], operator: "LessThan", [valueKey]: val };
      case "$lte":
        return { path: [key], operator: "LessThanEqual", [valueKey]: val };
      case "$in":
        return { path: [key], operator: "ContainsAny", valueStringArray: val };
      case "$contains":
        return { path: [key], operator: "Like", valueString: `*${val}*` };
      default:
        return { path: [key], operator: "Equal", [valueKey]: val };
    }
  }
  return {};
}

/**
 * Get the appropriate value key for Weaviate based on value type
 */
function getWeaviateValueKey(value: unknown): string {
  if (typeof value === "number") {
    return Number.isInteger(value) ? "valueInt" : "valueNumber";
  }
  if (typeof value === "boolean") {
    return "valueBoolean";
  }
  return "valueString";
}

/**
 * Translate abstract filter to Milvus format
 * @see https://milvus.io/docs/boolean.md
 */
export function translateToMilvus(filter: MetadataFilter): string {
  const conditions: string[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map(translateToMilvus);
      conditions.push(`(${subConditions.join(" && ")})`);
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map(translateToMilvus);
      conditions.push(`(${subConditions.join(" || ")})`);
    } else if (key === "$not") {
      const subCondition = translateToMilvus(value as MetadataFilter);
      conditions.push(`!(${subCondition})`);
    } else if (isFieldFilter(value)) {
      conditions.push(translateMilvusFieldFilter(key, value as FieldFilter));
    } else {
      // Simple equality
      if (typeof value === "string") {
        conditions.push(`${sanitizeKey(key)} == "${value}"`);
      } else {
        conditions.push(`${sanitizeKey(key)} == ${value}`);
      }
    }
  }

  return conditions.join(" && ");
}

/**
 * Translate field filter to Milvus expression
 */
function translateMilvusFieldFilter(key: string, filter: FieldFilter): string {
  const safeKey = sanitizeKey(key);

  for (const [op, val] of Object.entries(filter)) {
    const formattedVal = typeof val === "string" ? `"${val}"` : val;
    switch (op) {
      case "$eq":
        return `${safeKey} == ${formattedVal}`;
      case "$ne":
        return `${safeKey} != ${formattedVal}`;
      case "$gt":
        return `${safeKey} > ${formattedVal}`;
      case "$gte":
        return `${safeKey} >= ${formattedVal}`;
      case "$lt":
        return `${safeKey} < ${formattedVal}`;
      case "$lte":
        return `${safeKey} <= ${formattedVal}`;
      case "$in":
        if (Array.isArray(val)) {
          const values = val
            .map((v) => (typeof v === "string" ? `"${v}"` : v))
            .join(", ");
          return `${safeKey} in [${values}]`;
        }
        return `${safeKey} == ${formattedVal}`;
      case "$nin":
        if (Array.isArray(val)) {
          const values = val
            .map((v) => (typeof v === "string" ? `"${v}"` : v))
            .join(", ");
          return `${safeKey} not in [${values}]`;
        }
        return `${safeKey} != ${formattedVal}`;
      default:
        return `${safeKey} == ${formattedVal}`;
    }
  }
  return "";
}

/**
 * Sanitize a key for SQL/query safety
 */
function sanitizeKey(key: string): string {
  // Remove any characters that could be used for SQL injection
  return key.replace(/[^a-zA-Z0-9_]/g, "_");
}
