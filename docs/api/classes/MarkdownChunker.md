[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MarkdownChunker

# Class: MarkdownChunker

Defined in: [rag/chunking/markdownChunker.ts:21](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/chunking/markdownChunker.ts#L21)

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

Defined in: [rag/chunking/markdownChunker.ts:22](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/chunking/markdownChunker.ts#L22)

Strategy name for identification

#### Implementation of

`Chunker.strategy`

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/chunking/markdownChunker.ts:24](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/chunking/markdownChunker.ts#L24)

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

Defined in: [rag/chunking/markdownChunker.ts:466](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/chunking/markdownChunker.ts#L466)

#### Parameters

##### config

[`BaseChunkerConfig`](../type-aliases/BaseChunkerConfig.md)

#### Returns

[`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)
