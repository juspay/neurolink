[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / LaTeXChunker

# Class: LaTeXChunker

Defined in: [rag/chunking/latexChunker.ts:21](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/chunking/latexChunker.ts#L21)

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

Defined in: [rag/chunking/latexChunker.ts:22](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/chunking/latexChunker.ts#L22)

Strategy name for identification

#### Implementation of

`Chunker.strategy`

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/chunking/latexChunker.ts:44](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/chunking/latexChunker.ts#L44)

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

Defined in: [rag/chunking/latexChunker.ts:323](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/chunking/latexChunker.ts#L323)

#### Parameters

##### config

[`BaseChunkerConfig`](../type-aliases/BaseChunkerConfig.md)

#### Returns

[`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)
