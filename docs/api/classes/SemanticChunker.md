[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / SemanticChunker

# Class: SemanticChunker

Defined in: [rag/chunking/semanticChunker.ts:24](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/chunking/semanticChunker.ts#L24)

Semantic chunker implementation
Uses embedding similarity to find natural content boundaries

## Implements

- [`Chunker`](../type-aliases/Chunker.md)

## Constructors

### Constructor

> **new SemanticChunker**(): `SemanticChunker`

#### Returns

`SemanticChunker`

## Properties

### strategy

> `readonly` **strategy**: `"semantic"`

Defined in: [rag/chunking/semanticChunker.ts:25](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/chunking/semanticChunker.ts#L25)

Strategy name for identification

#### Implementation of

`Chunker.strategy`

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/chunking/semanticChunker.ts:27](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/chunking/semanticChunker.ts#L27)

Split text into chunks

#### Parameters

##### text

`string`

The text to chunk

##### config?

[`SemanticChunkerConfig`](../type-aliases/SemanticChunkerConfig.md)

Strategy-specific configuration

#### Returns

`Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Array of chunks

#### Implementation of

`Chunker.chunk`

---

### validateConfig()

> **validateConfig**(`config`): [`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)

Defined in: [rag/chunking/semanticChunker.ts:390](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/chunking/semanticChunker.ts#L390)

#### Parameters

##### config

[`BaseChunkerConfig`](../type-aliases/BaseChunkerConfig.md)

#### Returns

[`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)
