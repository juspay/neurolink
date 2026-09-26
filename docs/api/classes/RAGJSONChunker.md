[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGJSONChunker

# Class: RAGJSONChunker

JSON-aware chunker implementation
Splits based on JSON structure

## Implements

- [`Chunker`](../type-aliases/Chunker.md)

## Constructors

### Constructor

> **new RAGJSONChunker**(): `JSONChunker`

#### Returns

`JSONChunker`

## Properties

### strategy

> `readonly` **strategy**: `"json"`

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

[`JSONChunkerConfig`](../type-aliases/JSONChunkerConfig.md)

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
