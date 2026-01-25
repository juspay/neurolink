/**
 * Metadata filter types for vector store queries
 * Provides a unified filter DSL that translates to provider-specific formats
 */

import type { JsonValue, UnknownRecord } from "./common.js";

/**
 * Comparison operators for metadata filtering
 */
export type ComparisonOperator =
  | "$eq" // Equal
  | "$ne" // Not equal
  | "$gt" // Greater than
  | "$gte" // Greater than or equal
  | "$lt" // Less than
  | "$lte" // Less than or equal
  | "$in" // In array
  | "$nin" // Not in array
  | "$exists" // Field exists
  | "$contains" // String contains
  | "$startsWith" // String starts with
  | "$endsWith"; // String ends with

/**
 * Logical operators for combining filters
 */
export type LogicalOperator = "$and" | "$or" | "$not";

/**
 * Field-level filter condition
 */
export type FieldFilter = {
  [K in ComparisonOperator]?: JsonValue;
};

/**
 * Metadata filter for vector queries
 * Supports nested conditions and logical operators
 *
 * @example
 * // Simple equality
 * { category: "tech" }
 *
 * @example
 * // Comparison operators
 * { price: { $gte: 100, $lte: 500 } }
 *
 * @example
 * // Logical operators
 * { $and: [{ category: "tech" }, { status: "active" }] }
 *
 * @example
 * // Combined
 * {
 *   $or: [
 *     { category: "tech", price: { $lt: 100 } },
 *     { featured: true }
 *   ]
 * }
 */
export type MetadataFilter<TMetadata extends UnknownRecord = UnknownRecord> = {
  [K in keyof TMetadata]?: TMetadata[K] | FieldFilter;
} & {
  $and?: MetadataFilter<TMetadata>[];
  $or?: MetadataFilter<TMetadata>[];
  $not?: MetadataFilter<TMetadata>;
};

/**
 * Type guard to check if a value is a FieldFilter
 */
export function isFieldFilter(value: unknown): value is FieldFilter {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const keys = Object.keys(value);
  return keys.some((k) => k.startsWith("$"));
}

/**
 * Type guard to check if a value is a logical operator key
 */
export function isLogicalOperator(key: string): key is LogicalOperator {
  return key === "$and" || key === "$or" || key === "$not";
}

/**
 * Type guard to check if a value is a comparison operator key
 */
export function isComparisonOperator(key: string): key is ComparisonOperator {
  return [
    "$eq",
    "$ne",
    "$gt",
    "$gte",
    "$lt",
    "$lte",
    "$in",
    "$nin",
    "$exists",
    "$contains",
    "$startsWith",
    "$endsWith",
  ].includes(key);
}

/**
 * Supported filter operators by provider
 * Used for validation and documentation
 */
export const PROVIDER_FILTER_SUPPORT: Record<
  string,
  { comparison: ComparisonOperator[]; logical: LogicalOperator[] }
> = {
  pinecone: {
    comparison: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"],
    logical: ["$and", "$or"],
  },
  qdrant: {
    comparison: [
      "$eq",
      "$ne",
      "$gt",
      "$gte",
      "$lt",
      "$lte",
      "$in",
      "$nin",
      "$contains",
    ],
    logical: ["$and", "$or", "$not"],
  },
  pgvector: {
    comparison: [
      "$eq",
      "$ne",
      "$gt",
      "$gte",
      "$lt",
      "$lte",
      "$in",
      "$nin",
      "$contains",
      "$startsWith",
      "$endsWith",
    ],
    logical: ["$and", "$or", "$not"],
  },
  chroma: {
    comparison: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"],
    logical: ["$and", "$or"],
  },
  weaviate: {
    comparison: [
      "$eq",
      "$ne",
      "$gt",
      "$gte",
      "$lt",
      "$lte",
      "$in",
      "$contains",
    ],
    logical: ["$and", "$or"],
  },
  milvus: {
    comparison: ["$eq", "$ne", "$gt", "$gte", "$lt", "$lte", "$in", "$nin"],
    logical: ["$and", "$or", "$not"],
  },
};
