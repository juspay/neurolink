[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LaTeXChunker

# Class: LaTeXChunker

LaTeX-aware chunker implementation
Splits based on LaTeX structure (sections, environments)

## Implements

- [`Chunker`](../type-aliases/Chunker.md)

## Constructors

### Constructor

> **new LaTeXChunker**(): `LaTeXChunker`

#### Returns

`LaTeXChunker`

## Properties

### strategy

> `readonly` **strategy**: `"latex"`

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

[`LaTeXChunkerConfig`](../type-aliases/LaTeXChunkerConfig.md)

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
