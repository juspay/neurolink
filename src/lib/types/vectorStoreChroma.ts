/**
 * Structural types for the Chroma vector store adapter
 * (`src/lib/rag/stores/chroma.ts`).
 *
 * These mirror the subset of the `chromadb` package's API the adapter
 * calls (`ChromaClient.getOrCreateCollection`, `Collection.upsert/query/
 * delete`). NeuroLink has zero runtime dependency on `chromadb` — callers
 * construct their own client and inject an object satisfying
 * `ChromaClientLike`.
 */

export type ChromaMetadataValue = string | number | boolean;
export type ChromaMetadata = Record<string, ChromaMetadataValue>;

/** Chroma's metadata `where` filter payload shape. */
export type ChromaWhere = Record<string, unknown>;

export type ChromaIncludeField =
  | "embeddings"
  | "metadatas"
  | "documents"
  | "distances";

export type ChromaUpsertParams = {
  ids: string[];
  embeddings?: number[][];
  metadatas?: Array<ChromaMetadata | null>;
  documents?: Array<string | null>;
};

export type ChromaQueryParams = {
  queryEmbeddings: number[][];
  nResults?: number;
  where?: ChromaWhere;
  include?: ChromaIncludeField[];
};

export type ChromaQueryResponse = {
  ids: string[][];
  embeddings?: Array<Array<number[] | null>> | null;
  metadatas?: Array<Array<ChromaMetadata | null>> | null;
  documents?: Array<Array<string | null>> | null;
  distances?: Array<Array<number | null>> | null;
};

export type ChromaDeleteParams = {
  ids?: string[];
  where?: ChromaWhere;
};

/**
 * Minimal structural interface for a Chroma collection handle, matching the
 * subset of `Collection` (from `chromadb`) the adapter calls.
 */
export type ChromaCollectionLike = {
  upsert(params: ChromaUpsertParams): Promise<unknown>;
  query(params: ChromaQueryParams): Promise<ChromaQueryResponse>;
  delete(params: ChromaDeleteParams): Promise<unknown>;
};

/**
 * Minimal structural interface for a Chroma client, matching the subset of
 * `ChromaClient` (from `chromadb`) the adapter calls.
 */
export type ChromaClientLike = {
  getOrCreateCollection(params: {
    name: string;
    metadata?: Record<string, unknown>;
  }): Promise<ChromaCollectionLike>;
};

export type ChromaDistanceMetric = "cosine" | "l2" | "ip";

export type ChromaVectorStoreOptions = {
  /**
   * The distance metric configured on the underlying Chroma collection(s)
   * (Chroma's `hnsw:space`). Used only to convert returned distances into a
   * `score`; see `src/lib/rag/stores/chroma.ts` module doc comment.
   * Defaults to `"cosine"`.
   */
  distanceMetric?: ChromaDistanceMetric;
};
