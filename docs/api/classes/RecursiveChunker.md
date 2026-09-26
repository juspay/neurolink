[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RecursiveChunker

# Class: RecursiveChunker

Recursive chunker implementation
Smart splitting based on content structure using hierarchical separators

## Implements

- [`Chunker`](../type-aliases/Chunker.md)

## Constructors

### Constructor

> **new RecursiveChunker**(): `RecursiveChunker`

#### Returns

`RecursiveChunker`

## Properties

### strategy

> `readonly` **strategy**: `"recursive"`

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

[`RecursiveChunkerConfig`](../type-aliases/RecursiveChunkerConfig.md)

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
