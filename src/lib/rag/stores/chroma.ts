/**
 * Chroma vector store adapter
 *
 * Implements the `VectorStore` contract (see `src/lib/types/rag.ts`) against
 * a Chroma collection. This module has zero runtime dependency on the
 * `chromadb` package: callers construct their own `ChromaClient` (or any
 * compatible object) and inject it here. The structural interfaces below
 * mirror the subset of the `chromadb` API this adapter relies on
 * (`getOrCreateCollection`, `collection.upsert/query/delete`).
 *
 * ## Distance -> similarity scoring
 *
 * Chroma returns *distances*, not similarities, and the meaning of that
 * distance depends entirely on the collection's configured `hnsw:space`
 * (this adapter does not — and cannot — set that; it is chosen when the
 * collection is created on the Chroma side). `distanceMetric` tells this
 * adapter which space the collection uses so it can invert the distance
 * into a `score` consistent with `InMemoryVectorStore` (higher = more
 * similar):
 *
 * - `"cosine"` (default): Chroma returns `distance = 1 - cosineSimilarity`,
 *   so `score = 1 - distance` reproduces `InMemoryVectorStore`'s cosine
 *   score exactly.
 * - `"ip"`: Chroma returns `distance = 1 - dot(a, b)`, so
 *   `score = 1 - distance` yields the raw dot product — only equal to
 *   cosine similarity if both vectors are unit-normalized.
 * - `"l2"`: Chroma returns squared Euclidean distance, range
 *   `[0, Infinity)`, which has no exact inverse into a cosine-similarity
 *   scale. It is converted via `score = 1 / (1 + distance)`, a
 *   monotonically decreasing-in-distance map into `(0, 1]`. This preserves
 *   result ordering but is NOT numerically comparable to cosine scores.
 *
 * Passing a `distanceMetric` that does not match the collection's actual
 * `hnsw:space` will silently produce meaningless scores (Chroma has no way
 * to report its configured space back to the client), so callers must keep
 * the two in sync.
 *
 * ## Metadata round-tripping
 *
 * Chroma metadata values must be strings, numbers, or booleans. Values that
 * are `undefined` are dropped (Chroma rejects `undefined`); any other
 * non-primitive value (object, array, `null`) is `JSON.stringify`-ed on
 * write. This is lossy: such values come back as JSON-encoded strings on
 * read, not their original type. Store only primitive metadata values if
 * you need exact round-tripping.
 *
 * ## indexName -> collection mapping
 *
 * `indexName` is used verbatim as the Chroma collection name (1:1,
 * lazily created via `getOrCreateCollection` and cached for the lifetime of
 * this adapter instance).
 */

import type {
  ChromaClientLike,
  ChromaCollectionLike,
  ChromaDistanceMetric,
  ChromaIncludeField,
  ChromaMetadata,
  ChromaMetadataValue,
  ChromaVectorStoreOptions,
  ChromaWhere,
  MetadataFilter,
  VectorQueryResult,
  VectorStore,
} from "../../types/index.js";

// Structural Chroma client/collection types (`ChromaClientLike`,
// `ChromaCollectionLike`, `ChromaUpsertParams`, etc.) live in
// `src/lib/types/vectorStoreChroma.ts` per this repo's canonical-type-
// location rule (see CLAUDE.md Critical Rules 2 & 12) and are imported from
// the types barrel above. This file only re-exports runtime values
// (`ChromaVectorStore`, `translateMetadataFilter`) — consumers who need the
// structural types should import them from `@juspay/neurolink` (root) or
// the types barrel directly, per Critical Rule 13.

// ---------------------------------------------------------------------------
// MetadataFilter -> Chroma `where` translation
// ---------------------------------------------------------------------------

const CHROMA_SUPPORTED_FIELD_OPS = new Set([
  "$eq",
  "$ne",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$in",
  "$nin",
]);

const CHROMA_UNSUPPORTED_FIELD_OP_REASONS: Record<string, string> = {
  $exists:
    'Chroma metadata filtering has no existence check on the "where" clause.',
  $contains:
    'Chroma metadata filtering has no substring-match operator on the "where" clause (Chroma\'s substring matching only applies to document text via "where_document", not metadata field values).',
  $regex:
    'Chroma metadata filtering has no regular-expression operator on the "where" clause.',
  $size:
    'Chroma metadata filtering has no array-length operator on the "where" clause.',
};

function unsupportedFieldOpError(opKey: string, field: string): Error {
  const reason =
    CHROMA_UNSUPPORTED_FIELD_OP_REASONS[opKey] ??
    `Chroma metadata filtering does not support the "${opKey}" operator on the "where" clause.`;
  return new Error(
    `Unsupported operator "${opKey}" (field "${field}"): ${reason}`,
  );
}

/**
 * Translates a field-level filter value (either a direct-equality primitive
 * or an operator bag) into a Chroma `where` clause fragment for that field.
 *
 * Returns `undefined` when the filter value carries no enforceable
 * constraint (an array, or an operator bag with no recognized keys) — this
 * mirrors `InMemoryVectorStore.matchesFilter`, which treats any non-null
 * object value as an "operator bag" and silently applies none of its checks
 * when no recognized `$`-key is present, i.e. the field matches
 * unconditionally. Omitting the field from the Chroma `where` clause
 * reproduces that same "always matches" behavior.
 */
function translateFieldFilter(
  field: string,
  value: unknown,
): ChromaWhere | undefined {
  if (Array.isArray(value)) {
    return undefined;
  }
  if (value === null || typeof value !== "object") {
    return { [field]: { $eq: value } };
  }

  const ops = value as Record<string, unknown>;
  const opKeys = Object.keys(ops);
  if (opKeys.length === 0) {
    return undefined;
  }

  const chromaOps: Record<string, unknown> = {};
  for (const opKey of opKeys) {
    if (!CHROMA_SUPPORTED_FIELD_OPS.has(opKey)) {
      throw unsupportedFieldOpError(opKey, field);
    }
    chromaOps[opKey] = ops[opKey];
  }
  return { [field]: chromaOps };
}

function translateLogicalOperator(key: string, value: unknown): ChromaWhere {
  switch (key) {
    case "$and":
      return {
        $and: (value as MetadataFilter[]).map(translateMetadataFilter),
      };
    case "$or":
      return {
        $or: (value as MetadataFilter[]).map(translateMetadataFilter),
      };
    case "$not":
      throw new Error(
        'Chroma metadata filtering has no negation operator on the "where" clause; "$not" cannot be translated. Rewrite the filter using $ne/$nin instead.',
      );
    case "$nor":
      throw new Error(
        '"$nor" is declared on MetadataFilter but is not implemented by InMemoryVectorStore either, and Chroma has no negation operator on the "where" clause. Rewrite using $and of $ne/$nin clauses.',
      );
    default:
      throw new Error(`Unknown logical operator "${key}" in MetadataFilter.`);
  }
}

/**
 * Translates a `MetadataFilter` into a Chroma `where` clause.
 *
 * Throws a clear error for any operator Chroma's metadata `where` clause
 * cannot express ($not, $nor, $exists, $contains, $regex, $size) rather than
 * silently dropping the constraint and mis-filtering results.
 */
export function translateMetadataFilter(filter: MetadataFilter): ChromaWhere {
  const clauses: ChromaWhere[] = [];
  for (const [key, value] of Object.entries(filter)) {
    const clause = key.startsWith("$")
      ? translateLogicalOperator(key, value)
      : translateFieldFilter(key, value);
    if (clause !== undefined) {
      clauses.push(clause);
    }
  }

  if (clauses.length === 0) {
    return {};
  }
  if (clauses.length === 1) {
    return clauses[0];
  }
  // Chroma requires a single top-level operator; combine multiple field/
  // logical clauses with an explicit $and (mirrors matchesFilter ANDing
  // every top-level entry).
  return { $and: clauses };
}

// ---------------------------------------------------------------------------
// Metadata <-> Chroma metadata conversion
// ---------------------------------------------------------------------------

function toChromaMetadataValue(value: unknown): ChromaMetadataValue {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  // Chroma metadata values must be string | number | boolean. Non-primitive
  // values (object, array, null) are JSON-stringified — lossy on read back,
  // see module doc comment.
  return JSON.stringify(value);
}

function toChromaMetadata(metadata: Record<string, unknown>): ChromaMetadata {
  const result: ChromaMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value === undefined) {
      // Chroma rejects `undefined` metadata values outright.
      continue;
    }
    result[key] = toChromaMetadataValue(value);
  }
  return result;
}

function distanceToScore(
  distance: number,
  metric: ChromaDistanceMetric,
): number {
  switch (metric) {
    case "cosine":
    case "ip":
      return 1 - distance;
    case "l2":
      return 1 / (1 + distance);
    default: {
      const exhaustive: never = metric;
      throw new Error(`Unknown Chroma distance metric: ${String(exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// ChromaVectorStore
// ---------------------------------------------------------------------------

export class ChromaVectorStore implements VectorStore {
  private readonly collections = new Map<
    string,
    Promise<ChromaCollectionLike>
  >();
  private readonly distanceMetric: ChromaDistanceMetric;

  constructor(
    private readonly client: ChromaClientLike,
    options: ChromaVectorStoreOptions = {},
  ) {
    this.distanceMetric = options.distanceMetric ?? "cosine";
  }

  private getCollection(indexName: string): Promise<ChromaCollectionLike> {
    let collection = this.collections.get(indexName);
    if (!collection) {
      collection = this.client.getOrCreateCollection({ name: indexName });
      this.collections.set(indexName, collection);
    }
    return collection;
  }

  /**
   * Add or update vectors in an index (Chroma collection).
   */
  async upsert(
    indexName: string,
    items: Array<{
      id: string;
      vector: number[];
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const collection = await this.getCollection(indexName);
    await collection.upsert({
      ids: items.map((item) => item.id),
      embeddings: items.map((item) => item.vector),
      metadatas: items.map((item) => toChromaMetadata(item.metadata ?? {})),
    });
  }

  /**
   * Query vectors by similarity.
   */
  async query(params: {
    indexName: string;
    queryVector: number[];
    topK?: number;
    filter?: MetadataFilter;
    includeVectors?: boolean;
  }): Promise<VectorQueryResult[]> {
    const {
      indexName,
      queryVector,
      topK = 10,
      filter,
      includeVectors = false,
    } = params;

    const collection = await this.getCollection(indexName);

    const include: ChromaIncludeField[] = ["metadatas", "distances"];
    if (includeVectors) {
      include.push("embeddings");
    }

    const response = await collection.query({
      queryEmbeddings: [queryVector],
      nResults: topK,
      ...(filter ? { where: translateMetadataFilter(filter) } : {}),
      include,
    });

    const ids = response.ids[0] ?? [];
    const metadatasRow = response.metadatas?.[0] ?? [];
    const distancesRow = response.distances?.[0] ?? [];
    const embeddingsRow = response.embeddings?.[0] ?? [];

    return ids.map((id, i) => {
      const metadata = (metadatasRow[i] ?? {}) as Record<string, unknown>;
      const distance = distancesRow[i];
      const score =
        distance === null || distance === undefined
          ? undefined
          : distanceToScore(distance, this.distanceMetric);

      return {
        id,
        score,
        text: metadata.text as string | undefined,
        metadata,
        ...(includeVectors ? { vector: embeddingsRow[i] ?? [] } : {}),
      };
    });
  }

  /**
   * Delete vectors from an index (Chroma collection) by id.
   */
  async delete(indexName: string, ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }
    const collection = await this.getCollection(indexName);
    await collection.delete({ ids });
  }
}
