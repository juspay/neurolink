[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SemanticChunker

# Class: SemanticChunker

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

#### Parameters

##### config

[`BaseChunkerConfig`](../type-aliases/BaseChunkerConfig.md)

#### Returns

[`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)
