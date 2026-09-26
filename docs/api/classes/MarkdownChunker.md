[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MarkdownChunker

# Class: MarkdownChunker

Markdown-aware chunker implementation
Splits based on markdown structure (headers, code blocks, etc.)

## Implements

- [`Chunker`](../type-aliases/Chunker.md)

## Constructors

### Constructor

> **new MarkdownChunker**(): `MarkdownChunker`

#### Returns

`MarkdownChunker`

## Properties

### strategy

> `readonly` **strategy**: `"markdown"`

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

[`MarkdownChunkerConfig`](../type-aliases/MarkdownChunkerConfig.md)

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
