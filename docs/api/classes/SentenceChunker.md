[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SentenceChunker

# Class: SentenceChunker

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

Strategy name for identification

#### Implementation of

`Chunker.strategy`

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

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

#### Parameters

##### config

[`BaseChunkerConfig`](../type-aliases/BaseChunkerConfig.md)

#### Returns

[`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)
