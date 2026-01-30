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

/**
 * Translate abstract filter to Upstash Vector format
 * @see https://upstash.com/docs/vector/features/filtering
 */
export function translateToUpstash(
  filter: MetadataFilter,
): Record<string, unknown> {
  const conditions: unknown[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      return {
        AND: (value as MetadataFilter[]).map(translateToUpstash),
      };
    } else if (key === "$or") {
      return {
        OR: (value as MetadataFilter[]).map(translateToUpstash),
      };
    } else if (key === "$not") {
      // Upstash doesn't have direct $not, negate conditions
      const inner = translateToUpstash(value as MetadataFilter);
      for (const [k, v] of Object.entries(inner)) {
        if (typeof v === "object" && v !== null && "EQ" in v) {
          conditions.push({
            [k]: { NEQ: (v as Record<string, unknown>)["EQ"] },
          });
        } else {
          conditions.push({ [k]: { NEQ: v } });
        }
      }
    } else if (isFieldFilter(value)) {
      conditions.push({
        [key]: translateUpstashFieldFilter(value as FieldFilter),
      });
    } else {
      conditions.push({ [key]: { EQ: value } });
    }
  }

  if (conditions.length === 1) {
    return conditions[0] as Record<string, unknown>;
  }
  return { AND: conditions };
}

/**
 * Translate field filter to Upstash format
 */
function translateUpstashFieldFilter(
  filter: FieldFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        result["EQ"] = val;
        break;
      case "$ne":
        result["NEQ"] = val;
        break;
      case "$gt":
        result["GT"] = val;
        break;
      case "$gte":
        result["GTE"] = val;
        break;
      case "$lt":
        result["LT"] = val;
        break;
      case "$lte":
        result["LTE"] = val;
        break;
      case "$in":
        result["IN"] = val;
        break;
      case "$nin":
        result["NIN"] = val;
        break;
      case "$contains":
        result["CONTAINS"] = val;
        break;
      default:
        result["EQ"] = val;
    }
  }
  return result;
}

/**
 * Translate abstract filter to Elasticsearch format
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html
 */
export function translateToElasticsearch(
  filter: MetadataFilter,
): Record<string, unknown> {
  const must: unknown[] = [];
  const should: unknown[] = [];
  const mustNot: unknown[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const andConditions = (value as MetadataFilter[]).map(
        translateToElasticsearch,
      );
      must.push(...andConditions);
    } else if (key === "$or") {
      const orConditions = (value as MetadataFilter[]).map(
        translateToElasticsearch,
      );
      should.push(...orConditions);
    } else if (key === "$not") {
      mustNot.push(translateToElasticsearch(value as MetadataFilter));
    } else if (isFieldFilter(value)) {
      const clause = translateElasticsearchFieldFilter(
        key,
        value as FieldFilter,
      );
      must.push(clause);
    } else {
      must.push({ term: { [`metadata.${key}`]: value } });
    }
  }

  const bool: Record<string, unknown> = {};
  if (must.length > 0) {bool["must"] = must;}
  if (should.length > 0) {
    bool["should"] = should;
    bool["minimum_should_match"] = 1;
  }
  if (mustNot.length > 0) {bool["must_not"] = mustNot;}

  return { bool };
}

/**
 * Translate field filter to Elasticsearch format
 */
function translateElasticsearchFieldFilter(
  key: string,
  filter: FieldFilter,
): Record<string, unknown> {
  const field = `metadata.${key}`;
  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        return { term: { [field]: val } };
      case "$ne":
        return { bool: { must_not: [{ term: { [field]: val } }] } };
      case "$gt":
        return { range: { [field]: { gt: val } } };
      case "$gte":
        return { range: { [field]: { gte: val } } };
      case "$lt":
        return { range: { [field]: { lt: val } } };
      case "$lte":
        return { range: { [field]: { lte: val } } };
      case "$in":
        return { terms: { [field]: val } };
      case "$nin":
        return { bool: { must_not: [{ terms: { [field]: val } }] } };
      case "$contains":
        return { wildcard: { [field]: `*${val}*` } };
      case "$exists":
        if (val) {
          return { exists: { field } };
        } else {
          return { bool: { must_not: [{ exists: { field } }] } };
        }
      default:
        return { term: { [field]: val } };
    }
  }
  return {};
}

/**
 * Translate abstract filter to MongoDB format
 * @see https://www.mongodb.com/docs/manual/reference/operator/query/
 */
export function translateToMongoDB(
  filter: MetadataFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      result["$and"] = (value as MetadataFilter[]).map(translateToMongoDB);
    } else if (key === "$or") {
      result["$or"] = (value as MetadataFilter[]).map(translateToMongoDB);
    } else if (key === "$not") {
      // MongoDB uses $not differently - wrap conditions
      const inner = translateToMongoDB(value as MetadataFilter);
      for (const [k, v] of Object.entries(inner)) {
        result[k] = { $not: v };
      }
    } else if (isFieldFilter(value)) {
      result[`metadata.${key}`] = translateMongoDBFieldFilter(
        value as FieldFilter,
      );
    } else {
      result[`metadata.${key}`] = value;
    }
  }

  return result;
}

/**
 * Translate field filter to MongoDB format
 */
function translateMongoDBFieldFilter(
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
        result["$regex"] = val;
        result["$options"] = "i";
        break;
      case "$exists":
        result["$exists"] = val;
        break;
      default:
        result["$eq"] = val;
    }
  }
  return result;
}

/**
 * Result type for DuckDB filter translation
 */
export type DuckDBFilterResult = {
  sql: string;
  params: unknown[];
  nextIndex: number;
};

/**
 * Translate abstract filter to DuckDB SQL format
 * @param filter The metadata filter to translate
 * @param paramIndex Starting parameter index for parameterized queries
 */
export function translateToDuckDB(
  filter: MetadataFilter,
  paramIndex: number = 1,
): DuckDBFilterResult {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let currentIndex = paramIndex;

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToDuckDB(f, currentIndex);
        currentIndex = result.nextIndex;
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(subConditions.join(" AND "));
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToDuckDB(f, currentIndex);
        currentIndex = result.nextIndex;
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(`(${subConditions.join(" OR ")})`);
    } else if (key === "$not") {
      const result = translateToDuckDB(value as MetadataFilter, currentIndex);
      currentIndex = result.nextIndex;
      params.push(...result.params);
      conditions.push(`NOT (${result.sql})`);
    } else if (isFieldFilter(value)) {
      const { sql, param, newIndex } = translateDuckDBFieldFilter(
        key,
        value as FieldFilter,
        currentIndex,
      );
      conditions.push(sql);
      params.push(...param);
      currentIndex = newIndex;
    } else {
      // Simple equality - DuckDB uses JSON extraction
      const safeKey = sanitizeKey(key);
      if (typeof value === "string") {
        conditions.push(`metadata->>'${safeKey}' = $${currentIndex}`);
        params.push(value);
      } else if (typeof value === "number") {
        conditions.push(
          `CAST(metadata->>'${safeKey}' AS DOUBLE) = $${currentIndex}`,
        );
        params.push(value);
      } else if (typeof value === "boolean") {
        conditions.push(
          `CAST(metadata->>'${safeKey}' AS BOOLEAN) = $${currentIndex}`,
        );
        params.push(value);
      } else {
        conditions.push(`metadata->>'${safeKey}' = $${currentIndex}`);
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
 * Translate DuckDB field filter
 */
function translateDuckDBFieldFilter(
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
          sql: `CAST(metadata->>'${safeKey}' AS DOUBLE) > $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$gte":
        return {
          sql: `CAST(metadata->>'${safeKey}' AS DOUBLE) >= $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$lt":
        return {
          sql: `CAST(metadata->>'${safeKey}' AS DOUBLE) < $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$lte":
        return {
          sql: `CAST(metadata->>'${safeKey}' AS DOUBLE) <= $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$in":
        return {
          sql: `metadata->>'${safeKey}' IN (SELECT UNNEST($${index}::TEXT[]))`,
          param: [val],
          newIndex: index + 1,
        };
      case "$nin":
        return {
          sql: `metadata->>'${safeKey}' NOT IN (SELECT UNNEST($${index}::TEXT[]))`,
          param: [val],
          newIndex: index + 1,
        };
      case "$contains":
        return {
          sql: `metadata->>'${safeKey}' LIKE $${index}`,
          param: [`%${val}%`],
          newIndex: index + 1,
        };
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
 * Translate abstract filter to LanceDB SQL-like format
 * @see https://lancedb.github.io/lancedb/
 */
export function translateToLance(filter: MetadataFilter): string {
  const conditions: string[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map(translateToLance);
      conditions.push(`(${subConditions.join(" AND ")})`);
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map(translateToLance);
      conditions.push(`(${subConditions.join(" OR ")})`);
    } else if (key === "$not") {
      const subCondition = translateToLance(value as MetadataFilter);
      conditions.push(`NOT (${subCondition})`);
    } else if (isFieldFilter(value)) {
      conditions.push(translateLanceFieldFilter(key, value as FieldFilter));
    } else {
      // Simple equality
      const safeKey = sanitizeKey(key);
      if (typeof value === "string") {
        conditions.push(`${safeKey} = '${value.replace(/'/g, "''")}'`);
      } else {
        conditions.push(`${safeKey} = ${value}`);
      }
    }
  }

  return conditions.join(" AND ");
}

/**
 * Translate field filter to LanceDB expression
 */
function translateLanceFieldFilter(key: string, filter: FieldFilter): string {
  const safeKey = sanitizeKey(key);

  for (const [op, val] of Object.entries(filter)) {
    const formattedVal =
      typeof val === "string"
        ? `'${(val as string).replace(/'/g, "''")}'`
        : val;
    switch (op) {
      case "$eq":
        return `${safeKey} = ${formattedVal}`;
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
            .map((v) =>
              typeof v === "string"
                ? `'${(v as string).replace(/'/g, "''")}'`
                : v,
            )
            .join(", ");
          return `${safeKey} IN (${values})`;
        }
        return `${safeKey} = ${formattedVal}`;
      case "$nin":
        if (Array.isArray(val)) {
          const values = val
            .map((v) =>
              typeof v === "string"
                ? `'${(v as string).replace(/'/g, "''")}'`
                : v,
            )
            .join(", ");
          return `${safeKey} NOT IN (${values})`;
        }
        return `${safeKey} != ${formattedVal}`;
      case "$contains":
        return `${safeKey} LIKE '%${(val as string).replace(/'/g, "''")}%'`;
      default:
        return `${safeKey} = ${formattedVal}`;
    }
  }
  return "";
}

/**
 * Translate abstract filter to Azure AI Search format
 * @see https://learn.microsoft.com/en-us/azure/search/search-query-odata-filter
 */
export function translateToAzureAiSearch(filter: MetadataFilter): string {
  const conditions: string[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map(
        translateToAzureAiSearch,
      );
      conditions.push(`(${subConditions.join(" and ")})`);
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map(
        translateToAzureAiSearch,
      );
      conditions.push(`(${subConditions.join(" or ")})`);
    } else if (key === "$not") {
      const subCondition = translateToAzureAiSearch(value as MetadataFilter);
      conditions.push(`not (${subCondition})`);
    } else if (isFieldFilter(value)) {
      conditions.push(translateAzureFieldFilter(key, value as FieldFilter));
    } else {
      // Simple equality
      const safeKey = sanitizeKey(key);
      if (typeof value === "string") {
        conditions.push(`${safeKey} eq '${value}'`);
      } else {
        conditions.push(`${safeKey} eq ${value}`);
      }
    }
  }

  return conditions.join(" and ");
}

/**
 * Translate field filter to Azure AI Search OData format
 */
function translateAzureFieldFilter(key: string, filter: FieldFilter): string {
  const safeKey = sanitizeKey(key);

  for (const [op, val] of Object.entries(filter)) {
    const formattedVal = typeof val === "string" ? `'${val}'` : val;
    switch (op) {
      case "$eq":
        return `${safeKey} eq ${formattedVal}`;
      case "$ne":
        return `${safeKey} ne ${formattedVal}`;
      case "$gt":
        return `${safeKey} gt ${formattedVal}`;
      case "$gte":
        return `${safeKey} ge ${formattedVal}`;
      case "$lt":
        return `${safeKey} lt ${formattedVal}`;
      case "$lte":
        return `${safeKey} le ${formattedVal}`;
      case "$in":
        if (Array.isArray(val)) {
          const terms = val.map(
            (v) => `${safeKey} eq ${typeof v === "string" ? `'${v}'` : v}`,
          );
          return `(${terms.join(" or ")})`;
        }
        return `${safeKey} eq ${formattedVal}`;
      case "$contains":
        return `search.ismatch('${val}', '${safeKey}')`;
      default:
        return `${safeKey} eq ${formattedVal}`;
    }
  }
  return "";
}

/**
 * Translate abstract filter to Couchbase N1QL format
 * @see https://docs.couchbase.com/server/current/n1ql/n1ql-language-reference/index.html
 */
export function translateToCouchbase(
  filter: MetadataFilter,
  paramIndex: number = 1,
): { sql: string; params: unknown[]; nextIndex: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let currentIndex = paramIndex;

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToCouchbase(f, currentIndex);
        currentIndex = result.nextIndex;
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(subConditions.join(" AND "));
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToCouchbase(f, currentIndex);
        currentIndex = result.nextIndex;
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(`(${subConditions.join(" OR ")})`);
    } else if (key === "$not") {
      const result = translateToCouchbase(
        value as MetadataFilter,
        currentIndex,
      );
      currentIndex = result.nextIndex;
      params.push(...result.params);
      conditions.push(`NOT (${result.sql})`);
    } else if (isFieldFilter(value)) {
      const { sql, param, newIndex } = translateCouchbaseFieldFilter(
        key,
        value as FieldFilter,
        currentIndex,
      );
      conditions.push(sql);
      params.push(...param);
      currentIndex = newIndex;
    } else {
      // Simple equality
      const safeKey = sanitizeKey(key);
      conditions.push(`metadata.${safeKey} = $${currentIndex}`);
      params.push(value);
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
 * Translate Couchbase field filter
 */
function translateCouchbaseFieldFilter(
  key: string,
  filter: FieldFilter,
  paramIndex: number,
): { sql: string; param: unknown[]; newIndex: number } {
  const safeKey = sanitizeKey(key);
  const index = paramIndex;
  const field = `metadata.${safeKey}`;

  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        return {
          sql: `${field} = $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$ne":
        return {
          sql: `${field} != $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$gt":
        return {
          sql: `${field} > $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$gte":
        return {
          sql: `${field} >= $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$lt":
        return {
          sql: `${field} < $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$lte":
        return {
          sql: `${field} <= $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$in":
        return {
          sql: `${field} IN $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$nin":
        return {
          sql: `${field} NOT IN $${index}`,
          param: [val],
          newIndex: index + 1,
        };
      case "$contains":
        return {
          sql: `CONTAINS(${field}, $${index})`,
          param: [val],
          newIndex: index + 1,
        };
      case "$exists":
        if (val) {
          return { sql: `${field} IS NOT MISSING`, param: [], newIndex: index };
        } else {
          return { sql: `${field} IS MISSING`, param: [], newIndex: index };
        }
      default:
        return {
          sql: `${field} = $${index}`,
          param: [val],
          newIndex: index + 1,
        };
    }
  }

  return { sql: "TRUE", param: [], newIndex: index };
}

/**
 * Translate abstract filter to OpenSearch format
 * OpenSearch uses the same query DSL as Elasticsearch
 * @see https://opensearch.org/docs/latest/query-dsl/
 */
export function translateToOpenSearch(
  filter: MetadataFilter,
): Record<string, unknown> {
  // OpenSearch is API-compatible with Elasticsearch
  return translateToElasticsearch(filter);
}

/**
 * Translate abstract filter to AWS OpenSearch format
 * AWS OpenSearch uses Elasticsearch-compatible query DSL
 * @see https://docs.aws.amazon.com/opensearch-service/latest/developerguide/search-api.html
 */
export function translateToAwsOpensearch(
  filter: MetadataFilter,
): Record<string, unknown> {
  const conditions: unknown[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      return {
        bool: {
          must: (value as MetadataFilter[]).map(translateToAwsOpensearch),
        },
      };
    } else if (key === "$or") {
      return {
        bool: {
          should: (value as MetadataFilter[]).map(translateToAwsOpensearch),
          minimum_should_match: 1,
        },
      };
    } else if (key === "$not") {
      return {
        bool: {
          must_not: [translateToAwsOpensearch(value as MetadataFilter)],
        },
      };
    } else if (isFieldFilter(value)) {
      conditions.push(
        translateAwsOpensearchFieldFilter(key, value as FieldFilter),
      );
    } else {
      // Simple equality
      conditions.push({
        term: { [`metadata.${sanitizeKey(key)}`]: value },
      });
    }
  }

  if (conditions.length === 1) {
    return conditions[0] as Record<string, unknown>;
  }
  return {
    bool: {
      must: conditions,
    },
  };
}

/**
 * Translate field filter to AWS OpenSearch Query DSL
 */
function translateAwsOpensearchFieldFilter(
  key: string,
  filter: FieldFilter,
): Record<string, unknown> {
  const fieldPath = `metadata.${sanitizeKey(key)}`;

  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        return { term: { [fieldPath]: val } };
      case "$ne":
        return {
          bool: {
            must_not: [{ term: { [fieldPath]: val } }],
          },
        };
      case "$gt":
        return { range: { [fieldPath]: { gt: val } } };
      case "$gte":
        return { range: { [fieldPath]: { gte: val } } };
      case "$lt":
        return { range: { [fieldPath]: { lt: val } } };
      case "$lte":
        return { range: { [fieldPath]: { lte: val } } };
      case "$in":
        return { terms: { [fieldPath]: val } };
      case "$nin":
        return {
          bool: {
            must_not: [{ terms: { [fieldPath]: val } }],
          },
        };
      case "$contains":
        return { match: { [fieldPath]: val } };
      case "$startsWith":
        return { prefix: { [fieldPath]: val } };
      case "$exists":
        return val
          ? { exists: { field: fieldPath } }
          : {
              bool: {
                must_not: [{ exists: { field: fieldPath } }],
              },
            };
      default:
        return { term: { [fieldPath]: val } };
    }
  }
  return {};
}

/**
 * Translate abstract filter to Vertex Vector Search restricts format
 * @see https://cloud.google.com/vertex-ai/docs/vector-search/filter
 */
export function translateToVertexVectorSearch(
  filter: MetadataFilter,
): Array<{ namespace: string; allow_list?: string[]; deny_list?: string[] }> {
  const restricts: Array<{
    namespace: string;
    allow_list?: string[];
    deny_list?: string[];
  }> = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      // Combine all restricts from AND conditions
      const subRestricts = (value as MetadataFilter[]).flatMap(
        translateToVertexVectorSearch,
      );
      restricts.push(...subRestricts);
    } else if (key === "$or" || key === "$not") {
      // Vertex Vector Search has limited support for OR/NOT
      // Log a warning and skip
      console.warn(
        `Vertex Vector Search has limited support for ${key} operator`,
      );
    } else if (isFieldFilter(value)) {
      const restrict = translateVertexFieldFilter(key, value as FieldFilter);
      if (restrict) {
        restricts.push(restrict);
      }
    } else {
      // Simple equality - add to allow_list
      if (typeof value === "string") {
        restricts.push({
          namespace: key,
          allow_list: [value],
        });
      } else if (
        Array.isArray(value) &&
        value.every((v) => typeof v === "string")
      ) {
        restricts.push({
          namespace: key,
          allow_list: value as string[],
        });
      }
    }
  }

  return restricts;
}

/**
 * Translate field filter to Vertex Vector Search restrict
 */
function translateVertexFieldFilter(
  key: string,
  filter: FieldFilter,
): { namespace: string; allow_list?: string[]; deny_list?: string[] } | null {
  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        if (typeof val === "string") {
          return { namespace: key, allow_list: [val] };
        }
        break;
      case "$ne":
        if (typeof val === "string") {
          return { namespace: key, deny_list: [val] };
        }
        break;
      case "$in":
        if (Array.isArray(val) && val.every((v) => typeof v === "string")) {
          return { namespace: key, allow_list: val as string[] };
        }
        break;
      case "$nin":
        if (Array.isArray(val) && val.every((v) => typeof v === "string")) {
          return { namespace: key, deny_list: val as string[] };
        }
        break;
      default:
        // Vertex Vector Search primarily supports string equality filters
        console.warn(
          `Vertex Vector Search has limited support for ${op} operator`,
        );
    }
  }
  return null;
}

/**
 * Result type for LibSQL filter translation
 */
export type LibSQLFilterResult = {
  sql: string;
  params: unknown[];
};

/**
 * Translate abstract filter to LibSQL/SQLite format
 * LibSQL uses SQLite JSON functions for metadata access
 * @see https://www.sqlite.org/json1.html
 */
export function translateToLibSQL(filter: MetadataFilter): LibSQLFilterResult {
  const conditions: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToLibSQL(f);
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(subConditions.join(" AND "));
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map((f) => {
        const result = translateToLibSQL(f);
        params.push(...result.params);
        return `(${result.sql})`;
      });
      conditions.push(`(${subConditions.join(" OR ")})`);
    } else if (key === "$not") {
      const result = translateToLibSQL(value as MetadataFilter);
      params.push(...result.params);
      conditions.push(`NOT (${result.sql})`);
    } else if (isFieldFilter(value)) {
      const { sql, param } = translateLibSQLFieldFilter(
        key,
        value as FieldFilter,
      );
      conditions.push(sql);
      params.push(...param);
    } else {
      // Simple equality - LibSQL/SQLite uses json_extract
      const safeKey = sanitizeKey(key);
      if (typeof value === "string") {
        conditions.push(`json_extract(metadata, '$.${safeKey}') = ?`);
        params.push(value);
      } else if (typeof value === "number") {
        conditions.push(`json_extract(metadata, '$.${safeKey}') = ?`);
        params.push(value);
      } else if (typeof value === "boolean") {
        conditions.push(`json_extract(metadata, '$.${safeKey}') = ?`);
        params.push(value ? 1 : 0); // SQLite stores booleans as 0/1
      } else {
        conditions.push(`json_extract(metadata, '$.${safeKey}') = ?`);
        params.push(String(value));
      }
    }
  }

  return {
    sql: conditions.length > 0 ? conditions.join(" AND ") : "TRUE",
    params,
  };
}

/**
 * Translate LibSQL field filter
 */
function translateLibSQLFieldFilter(
  key: string,
  filter: FieldFilter,
): { sql: string; param: unknown[] } {
  const safeKey = sanitizeKey(key);
  const jsonPath = `json_extract(metadata, '$.${safeKey}')`;

  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        return { sql: `${jsonPath} = ?`, param: [val] };
      case "$ne":
        return { sql: `${jsonPath} != ?`, param: [val] };
      case "$gt":
        return { sql: `${jsonPath} > ?`, param: [val] };
      case "$gte":
        return { sql: `${jsonPath} >= ?`, param: [val] };
      case "$lt":
        return { sql: `${jsonPath} < ?`, param: [val] };
      case "$lte":
        return { sql: `${jsonPath} <= ?`, param: [val] };
      case "$in":
        if (Array.isArray(val)) {
          const placeholders = val.map(() => "?").join(", ");
          return { sql: `${jsonPath} IN (${placeholders})`, param: val };
        }
        return { sql: `${jsonPath} = ?`, param: [val] };
      case "$nin":
        if (Array.isArray(val)) {
          const placeholders = val.map(() => "?").join(", ");
          return { sql: `${jsonPath} NOT IN (${placeholders})`, param: val };
        }
        return { sql: `${jsonPath} != ?`, param: [val] };
      case "$contains":
        return { sql: `${jsonPath} LIKE ?`, param: [`%${val}%`] };
      case "$startsWith":
        return { sql: `${jsonPath} LIKE ?`, param: [`${val}%`] };
      case "$endsWith":
        return { sql: `${jsonPath} LIKE ?`, param: [`%${val}`] };
      case "$exists":
        if (val) {
          return { sql: `${jsonPath} IS NOT NULL`, param: [] };
        }
        return { sql: `${jsonPath} IS NULL`, param: [] };
      default:
        return { sql: `${jsonPath} = ?`, param: [val] };
    }
  }

  return { sql: "TRUE", param: [] };
}

/**
 * Translate abstract filter to Cloudflare Vectorize format
 * @see https://developers.cloudflare.com/vectorize/reference/metadata-filtering/
 */
export function translateToCloudflare(
  filter: MetadataFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      // Cloudflare doesn't have explicit $and - multiple conditions are implicitly AND
      const conditions = (value as MetadataFilter[]).map(translateToCloudflare);
      for (const condition of conditions) {
        Object.assign(result, condition);
      }
    } else if (key === "$or") {
      // Cloudflare has limited $or support
      // Use first condition as fallback
      const conditions = (value as MetadataFilter[]).map(translateToCloudflare);
      if (conditions.length > 0) {
        Object.assign(result, conditions[0]);
      }
    } else if (key === "$not") {
      // Cloudflare supports $ne for negation
      const inner = translateToCloudflare(value as MetadataFilter);
      for (const [k, v] of Object.entries(inner)) {
        if (typeof v === "object" && v !== null && "$eq" in v) {
          result[k] = { $ne: (v as Record<string, unknown>)["$eq"] };
        } else {
          result[k] = { $ne: v };
        }
      }
    } else if (isFieldFilter(value)) {
      result[key] = translateCloudflareFieldFilter(value as FieldFilter);
    } else {
      // Simple equality
      result[key] = { $eq: value };
    }
  }

  return result;
}

/**
 * Translate field filter to Cloudflare format
 */
function translateCloudflareFieldFilter(
  filter: FieldFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        result["$eq"] = val;
        break;
      case "$ne":
        result["$ne"] = val;
        break;
      case "$in":
        result["$in"] = val;
        break;
      case "$nin":
        // Cloudflare doesn't support $nin directly - use $ne with first value
        result["$ne"] = Array.isArray(val) ? val[0] : val;
        break;
      case "$gt":
      case "$gte":
      case "$lt":
      case "$lte":
        // Cloudflare supports numeric comparisons
        result[op] = val;
        break;
      default:
        result["$eq"] = val;
    }
  }
  return result;
}

/**
 * Translate abstract filter to DataStax Astra format
 * Astra uses MongoDB-like query syntax
 * @see https://docs.datastax.com/en/astra-db-serverless/api-reference/dataapi.html
 */
export function translateToAstra(
  filter: MetadataFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      result["$and"] = (value as MetadataFilter[]).map(translateToAstra);
    } else if (key === "$or") {
      result["$or"] = (value as MetadataFilter[]).map(translateToAstra);
    } else if (key === "$not") {
      // Astra uses $not similar to MongoDB
      result["$not"] = translateToAstra(value as MetadataFilter);
    } else if (isFieldFilter(value)) {
      result[key] = translateAstraFieldFilter(value as FieldFilter);
    } else {
      // Simple equality - Astra accepts direct value
      result[key] = value;
    }
  }

  return result;
}

/**
 * Translate field filter to Astra format
 */
function translateAstraFieldFilter(
  filter: FieldFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        result["$eq"] = val;
        break;
      case "$ne":
        result["$ne"] = val;
        break;
      case "$gt":
        result["$gt"] = val;
        break;
      case "$gte":
        result["$gte"] = val;
        break;
      case "$lt":
        result["$lt"] = val;
        break;
      case "$lte":
        result["$lte"] = val;
        break;
      case "$in":
        result["$in"] = val;
        break;
      case "$nin":
        result["$nin"] = val;
        break;
      case "$exists":
        result["$exists"] = val;
        break;
      case "$contains":
        // Astra uses $regex for pattern matching
        result["$regex"] = `.*${val}.*`;
        break;
      case "$startsWith":
        result["$regex"] = `^${val}`;
        break;
      case "$endsWith":
        result["$regex"] = `${val}$`;
        break;
      default:
        result["$eq"] = val;
    }
  }
  return result;
}

/**
 * Translate abstract filter to Vespa YQL format
 * @see https://docs.vespa.ai/en/reference/query-language-reference.html
 */
export function translateToVespa(filter: MetadataFilter): string {
  const conditions: string[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map(translateToVespa);
      conditions.push(`(${subConditions.join(" and ")})`);
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map(translateToVespa);
      conditions.push(`(${subConditions.join(" or ")})`);
    } else if (key === "$not") {
      const subCondition = translateToVespa(value as MetadataFilter);
      conditions.push(`!(${subCondition})`);
    } else if (isFieldFilter(value)) {
      conditions.push(translateVespaFieldFilter(key, value as FieldFilter));
    } else {
      // Simple equality - use contains for string matching
      if (typeof value === "string") {
        conditions.push(`metadata.${sanitizeKey(key)} contains "${value}"`);
      } else {
        conditions.push(`metadata.${sanitizeKey(key)} = ${value}`);
      }
    }
  }

  return conditions.length > 0 ? conditions.join(" and ") : "";
}

/**
 * Translate field filter to Vespa YQL expression
 */
function translateVespaFieldFilter(key: string, filter: FieldFilter): string {
  const safeKey = `metadata.${sanitizeKey(key)}`;

  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        if (typeof val === "string") {
          return `${safeKey} contains "${val}"`;
        }
        return `${safeKey} = ${val}`;
      case "$ne":
        if (typeof val === "string") {
          return `!(${safeKey} contains "${val}")`;
        }
        return `${safeKey} != ${val}`;
      case "$gt":
        return `${safeKey} > ${val}`;
      case "$gte":
        return `${safeKey} >= ${val}`;
      case "$lt":
        return `${safeKey} < ${val}`;
      case "$lte":
        return `${safeKey} <= ${val}`;
      case "$in":
        if (Array.isArray(val)) {
          const orConditions = val
            .map((v) =>
              typeof v === "string"
                ? `${safeKey} contains "${v}"`
                : `${safeKey} = ${v}`,
            )
            .join(" or ");
          return `(${orConditions})`;
        }
        return typeof val === "string"
          ? `${safeKey} contains "${val}"`
          : `${safeKey} = ${val}`;
      case "$nin":
        if (Array.isArray(val)) {
          const andConditions = val
            .map((v) =>
              typeof v === "string"
                ? `!(${safeKey} contains "${v}")`
                : `${safeKey} != ${v}`,
            )
            .join(" and ");
          return `(${andConditions})`;
        }
        return typeof val === "string"
          ? `!(${safeKey} contains "${val}")`
          : `${safeKey} != ${val}`;
      case "$contains":
        return `${safeKey} contains "*${val}*"`;
      case "$startsWith":
        return `${safeKey} contains "${val}*"`;
      case "$endsWith":
        return `${safeKey} contains "*${val}"`;
      case "$exists":
        // Vespa doesn't have a direct exists operator, use range check
        if (val) {
          return `${safeKey} > ""`;
        } else {
          return `!(${safeKey} > "")`;
        }
      default:
        return typeof val === "string"
          ? `${safeKey} contains "${val}"`
          : `${safeKey} = ${val}`;
    }
  }
  return "";
}

/**
 * Translate abstract filter to Marqo filter string format
 * @see https://docs.marqo.ai/latest/API-Reference/search/#filter-string
 */
export function translateToMarqo(filter: MetadataFilter): string {
  const conditions: string[] = [];

  for (const [key, value] of Object.entries(filter)) {
    if (key === "$and") {
      const subConditions = (value as MetadataFilter[]).map(translateToMarqo);
      conditions.push(`(${subConditions.join(" AND ")})`);
    } else if (key === "$or") {
      const subConditions = (value as MetadataFilter[]).map(translateToMarqo);
      conditions.push(`(${subConditions.join(" OR ")})`);
    } else if (key === "$not") {
      const subCondition = translateToMarqo(value as MetadataFilter);
      conditions.push(`NOT (${subCondition})`);
    } else if (isFieldFilter(value)) {
      conditions.push(translateMarqoFieldFilter(key, value as FieldFilter));
    } else {
      // Simple equality - Marqo uses field:(value) syntax
      conditions.push(`metadata.${sanitizeKey(key)}:(${value})`);
    }
  }

  return conditions.length > 0 ? conditions.join(" AND ") : "";
}

/**
 * Translate field filter to Marqo filter string
 */
function translateMarqoFieldFilter(key: string, filter: FieldFilter): string {
  const safeKey = `metadata.${sanitizeKey(key)}`;

  for (const [op, val] of Object.entries(filter)) {
    switch (op) {
      case "$eq":
        return `${safeKey}:(${val})`;
      case "$ne":
        return `NOT ${safeKey}:(${val})`;
      case "$gt":
        return `${safeKey}:>${val}`;
      case "$gte":
        return `${safeKey}:>=${val}`;
      case "$lt":
        return `${safeKey}:<${val}`;
      case "$lte":
        return `${safeKey}:<=${val}`;
      case "$in":
        if (Array.isArray(val)) {
          const orConditions = val.map((v) => `${safeKey}:(${v})`).join(" OR ");
          return `(${orConditions})`;
        }
        return `${safeKey}:(${val})`;
      case "$nin":
        if (Array.isArray(val)) {
          const andConditions = val
            .map((v) => `NOT ${safeKey}:(${v})`)
            .join(" AND ");
          return `(${andConditions})`;
        }
        return `NOT ${safeKey}:(${val})`;
      case "$contains":
        return `${safeKey}:(*${val}*)`;
      case "$startsWith":
        return `${safeKey}:(${val}*)`;
      case "$endsWith":
        return `${safeKey}:(*${val})`;
      case "$exists":
        if (val) {
          return `${safeKey}:*`;
        } else {
          return `NOT ${safeKey}:*`;
        }
      default:
        return `${safeKey}:(${val})`;
    }
  }
  return "";
}
