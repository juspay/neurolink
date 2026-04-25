/**
 * Curator P2-4 dedup (concurrency-safe): per-stream context that lets
 * the orchestration's `runStandardStreamRequest` finally block know
 * whether a *native provider* path within THIS stream's async chain
 * already emitted `generation:end`. Native providers (Vertex / Google
 * AI Studio for Gemini 3, etc.) emit on the shared SDK emitter; without
 * scoping, a concurrent unrelated stream's emit on the same NeuroLink
 * instance would suppress the wrong stream's orchestration emit.
 *
 * AsyncLocalStorage scopes each stream's flag to its own async chain.
 */
export type StreamGenerationEndContext = { providerEmitted: boolean };
