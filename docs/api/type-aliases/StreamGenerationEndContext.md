[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamGenerationEndContext

# Type Alias: StreamGenerationEndContext

> **StreamGenerationEndContext** = `object`

Defined in: [types/streamDedup.ts:12](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/streamDedup.ts#L12)

Curator P2-4 dedup (concurrency-safe): per-stream context that lets
the orchestration's `runStandardStreamRequest` finally block know
whether a _native provider_ path within THIS stream's async chain
already emitted `generation:end`. Native providers (Vertex / Google
AI Studio for Gemini 3, etc.) emit on the shared SDK emitter; without
scoping, a concurrent unrelated stream's emit on the same NeuroLink
instance would suppress the wrong stream's orchestration emit.

AsyncLocalStorage scopes each stream's flag to its own async chain.

## Properties

### providerEmitted

> **providerEmitted**: `boolean`

Defined in: [types/streamDedup.ts:12](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/streamDedup.ts#L12)
