[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentenceChunker

# Class: SentenceChunker

Defined in: [rag/chunking/sentenceChunker.ts:21](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/sentenceChunker.ts#L21)

Sentence-aware chunker implementation
Splits text by sentences while respecting size constraints

## Implements

- [`Chunker`](../type-aliases/Chunker.md)

## Constructors

### Constructor

> **new SentenceChunker**(): `SentenceChunker`

#### Returns

`SentenceChunker`

## Properties

### strategy

> `readonly` **strategy**: `"sentence"`

Defined in: [rag/chunking/sentenceChunker.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/sentenceChunker.ts#L22)

Strategy name for identification

#### Implementation of

`Chunker.strategy`

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/chunking/sentenceChunker.ts:26](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/sentenceChunker.ts#L26)

Split text into chunks

#### Parameters

##### text

`string`

The text to chunk

##### config?

[`SentenceChunkerConfig`](../type-aliases/SentenceChunkerConfig.md)

Strategy-specific configuration

#### Returns

`Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Array of chunks

#### Implementation of

`Chunker.chunk`

---

### validateConfig()

> **validateConfig**(`config`): [`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)

Defined in: [rag/chunking/sentenceChunker.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/sentenceChunker.ts#L250)

#### Parameters

##### config

[`BaseChunkerConfig`](../type-aliases/BaseChunkerConfig.md)

#### Returns

[`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)
