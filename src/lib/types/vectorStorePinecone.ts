/**
 * Structural types for the Pinecone vector store adapter
 * (`src/lib/rag/stores/pinecone.ts`).
 *
 * These mirror the subset of the `@pinecone-database/pinecone` package's API
 * the adapter calls (`Index.query/upsert/deleteMany`, optional
 * `Index.namespace`). NeuroLink has zero runtime dependency on the Pinecone
 * SDK — callers construct their own client/index and inject an object
 * satisfying `PineconeIndexLike`.
 */

/** A single scored match as returned by Pinecone's query API. */
export type PineconeMatch = {
  id: string;
  score?: number;
  values?: number[];
  metadata?: Record<string, unknown>;
};

/** Shape of the response returned by `PineconeIndexLike.query()`. */
export type PineconeQueryResponse = {
  matches?: PineconeMatch[];
};

/** Request payload accepted by `PineconeIndexLike.query()`. */
export type PineconeQueryRequest = {
  vector: number[];
  topK: number;
  filter?: Record<string, unknown>;
  includeMetadata?: boolean;
  includeValues?: boolean;
};

/** A single record accepted by `PineconeIndexLike.upsert()`. */
export type PineconeUpsertRecord = {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
};

/**
 * Minimal structural interface modeled on the `@pinecone-database/pinecone`
 * `Index` object. Satisfied by the real SDK's `Index` without modification;
 * callers never need to install the Pinecone SDK as a dependency of this
 * package — they bring their own already-constructed client instance.
 */
export type PineconeIndexLike = {
  /** Returns a client scoped to the given namespace, if the client supports namespacing. */
  namespace?(ns: string): PineconeIndexLike;
  query(request: PineconeQueryRequest): Promise<PineconeQueryResponse>;
  upsert(records: PineconeUpsertRecord[]): Promise<unknown>;
  deleteMany(ids: string[]): Promise<unknown>;
};
