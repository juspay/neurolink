[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / HTMLChunker

# Class: HTMLChunker

Defined in: [rag/chunking/htmlChunker.ts:21](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/htmlChunker.ts#L21)

HTML-aware chunker implementation
Splits based on HTML structure (tags, elements)

## Implements

- [`Chunker`](../type-aliases/Chunker.md)

## Constructors

### Constructor

> **new HTMLChunker**(): `HTMLChunker`

#### Returns

`HTMLChunker`

## Properties

### strategy

> `readonly` **strategy**: `"html"`

Defined in: [rag/chunking/htmlChunker.ts:22](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/htmlChunker.ts#L22)

Strategy name for identification

#### Implementation of

`Chunker.strategy`

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/chunking/htmlChunker.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/htmlChunker.ts#L49)

Split text into chunks

#### Parameters

##### text

`string`

The text to chunk

##### config?

[`HTMLChunkerConfig`](../type-aliases/HTMLChunkerConfig.md)

Strategy-specific configuration

#### Returns

`Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Array of chunks

#### Implementation of

`Chunker.chunk`

---

### validateConfig()

> **validateConfig**(`config`): [`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)

Defined in: [rag/chunking/htmlChunker.ts:313](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/htmlChunker.ts#L313)

#### Parameters

##### config

[`BaseChunkerConfig`](../type-aliases/BaseChunkerConfig.md)

#### Returns

[`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)
