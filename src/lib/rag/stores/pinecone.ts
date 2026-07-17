/**
 * Pinecone Vector Store Adapter
 *
 * Implements the `VectorStore` contract (see `src/lib/types/rag.ts`) against
 * a Pinecone index, using client injection: callers construct their own
 * `@pinecone-database/pinecone` client/index and pass it in. No Pinecone SDK
 * is a runtime dependency of this package — `PineconeIndexLike` below is a
 * minimal structural interface satisfied by the real `Index` object (and by
 * hand-written mocks in tests).
 *
 * ## indexName -> namespace mapping
 *
 * The `VectorStore` contract's `indexName` parameter is mapped onto a
 * Pinecone **namespace**, not a Pinecone index. Pinecone ties one client
 * `Index` object to a single physical index (created ahead of time via
 * Pinecone's control-plane API); namespaces are Pinecone's mechanism for
 * partitioning data *within* that one index, and are the closest match to
 * this SDK's per-call `indexName` concept.
 *
 * - If the injected client exposes `.namespace(name)` (as the real
 *   `@pinecone-database/pinecone` `Index.namespace()` does), every
 *   query/upsert/delete call routes through `client.namespace(indexName)`.
 * - If the injected client does not expose `.namespace` (e.g. a caller
 *   already pre-scoped their client to a fixed namespace, or a minimal
 *   mock), calls go straight to the injected client and `indexName` has
 *   no further effect. Document this for your callers if you construct a
 *   `PineconeVectorStore` from a namespace-fixed client.
 *
 * ## Metadata filter translation
 *
 * `MetadataFilter` (Mongo/Sift-style) is translated to Pinecone's native
 * filter DSL, which already shares the same `$op` shape for comparison
 * operators. Supported operators: `$eq`, `$ne`, `$gt`, `$gte`, `$lt`,
 * `$lte`, `$in`, `$nin` (field-level) and `$and` / `$or` (logical,
 * recursively translated). Any other operator — `$not`, `$nor`, `$exists`,
 * `$contains`, `$regex`, `$size` — has no Pinecone equivalent and throws a
 * clear `Error` naming the offending operator/field rather than silently
 * mis-filtering (Pinecone's filter DSL has no negation, existence, string
 * containment, regex, or array-length operators).
 */

// `PineconeIndexLike` / `PineconeMatch` / `PineconeQueryRequest` /
// `PineconeQueryResponse` / `PineconeUpsertRecord` are declared in
// src/lib/types/vectorStorePinecone.ts (repo convention: type aliases must
// live in src/lib/types/, re-exported to callers via the types barrel)
// rather than here — import them from `@juspay/neurolink` or
// `.../types/index.js` directly if you need to annotate a variable with
// them.
import type {
  MetadataFilter,
  PineconeIndexLike,
  VectorQueryResult,
  VectorStore,
} from "../../types/index.js";

/** Comparison operators Pinecone's filter DSL can express, verbatim. */
const SUPPORTED_COMPARISON_OPS: ReadonlySet<string> = new Set([
  "$eq",
  "$ne",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$in",
  "$nin",
]);

/** Logical operators Pinecone's filter DSL can express, verbatim. */
const SUPPORTED_LOGICAL_OPS: ReadonlySet<string> = new Set(["$and", "$or"]);

/**
 * Translate a `MetadataFilter` into Pinecone's native filter object.
 *
 * Throws a descriptive `Error` for any operator Pinecone cannot express
 * ($not, $nor, $exists, $contains, $regex, $size) instead of silently
 * dropping or mis-applying it.
 */
export function translatePineconeFilter(
  filter: MetadataFilter,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(filter)) {
    if (key.startsWith("$")) {
      if (!SUPPORTED_LOGICAL_OPS.has(key)) {
        throw new Error(
          `PineconeVectorStore: MetadataFilter operator "${key}" cannot be translated to Pinecone's filter DSL ` +
            `(supported logical operators: ${[...SUPPORTED_LOGICAL_OPS].join(", ")}). ` +
            `Restructure the filter to avoid "${key}".`,
        );
      }
      const subFilters = value as MetadataFilter[];
      result[key] = subFilters.map((sub) => translatePineconeFilter(sub));
      continue;
    }

    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const ops = value as Record<string, unknown>;
      const translatedOps: Record<string, unknown> = {};
      for (const opKey of Object.keys(ops)) {
        if (!SUPPORTED_COMPARISON_OPS.has(opKey)) {
          throw new Error(
            `PineconeVectorStore: MetadataFilter operator "${opKey}" on field "${key}" cannot be translated to ` +
              `Pinecone's filter DSL (supported: ${[...SUPPORTED_COMPARISON_OPS].join(", ")}). ` +
              `Restructure the filter to avoid "${opKey}" on "${key}".`,
          );
        }
        translatedOps[opKey] = ops[opKey];
      }
      result[key] = translatedOps;
    } else {
      // Primitive/array/null value: Pinecone treats a bare value as
      // implicit equality, matching InMemoryVectorStore's direct-equality
      // fallback for non-object filter values.
      result[key] = value;
    }
  }

  return result;
}

/**
 * Pinecone-backed implementation of the `VectorStore` contract.
 *
 * @example
 * ```typescript
 * import { Pinecone } from '@pinecone-database/pinecone';
 * import { PineconeVectorStore } from '@juspay/neurolink/rag';
 *
 * const client = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
 * const store = new PineconeVectorStore(client.index('my-index'));
 *
 * await store.upsert('tenant-a', [{ id: '1', vector: [...], metadata: { text: 'hello' } }]);
 * const results = await store.query({ indexName: 'tenant-a', queryVector: [...], topK: 5 });
 * ```
 */
export class PineconeVectorStore implements VectorStore {
  constructor(private readonly client: PineconeIndexLike) {}

  /** Resolve the Pinecone client scoped to `indexName` (see class docs re: namespace mapping). */
  private resolveClient(indexName: string): PineconeIndexLike {
    return this.client.namespace
      ? this.client.namespace(indexName)
      : this.client;
  }

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

    const target = this.resolveClient(indexName);
    const response = await target.query({
      vector: queryVector,
      topK,
      ...(filter ? { filter: translatePineconeFilter(filter) } : {}),
      includeMetadata: true,
      includeValues: includeVectors,
    });

    const matches = response.matches ?? [];
    return matches.map((match) => {
      const metadata = match.metadata ?? {};
      return {
        id: match.id,
        score: match.score,
        text: metadata.text as string | undefined,
        metadata,
        ...(includeVectors && match.values ? { vector: match.values } : {}),
      };
    });
  }

  /** Add or update vectors in the namespace mapped from `indexName`. */
  async upsert(
    indexName: string,
    items: Array<{
      id: string;
      vector: number[];
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    const target = this.resolveClient(indexName);
    await target.upsert(
      items.map((item) => ({
        id: item.id,
        values: item.vector,
        metadata: item.metadata ?? {},
      })),
    );
  }

  /** Delete vectors by id from the namespace mapped from `indexName`. */
  async delete(indexName: string, ids: string[]): Promise<void> {
    const target = this.resolveClient(indexName);
    await target.deleteMany(ids);
  }
}
