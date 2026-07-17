/**
 * Vector Store Adapters
 *
 * Client-injection adapters implementing the `VectorStore` contract
 * (see `src/lib/types/rag.ts`) against real vector database backends.
 * Each adapter accepts an already-constructed vendor client typed as a
 * minimal structural interface — no vendor SDK is a runtime dependency
 * of this package; callers bring their own client instance.
 *
 * @example
 * ```typescript
 * import { PineconeVectorStore } from '@juspay/neurolink/rag';
 * import { Pinecone } from '@pinecone-database/pinecone';
 *
 * const client = new Pinecone({ apiKey: '...' });
 * const store = new PineconeVectorStore(client.index('my-index'));
 * ```
 */

export * from "./pinecone.js";
export * from "./pgvector.js";
export * from "./chroma.js";
