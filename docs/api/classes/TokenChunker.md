[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenChunker

# Class: TokenChunker

Defined in: [rag/chunking/tokenChunker.ts:24](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/tokenChunker.ts#L24)

Token-aware chunker implementation
Splits text based on approximate token counts

Note: Uses simple word-based tokenization as approximation.
For exact token counts, integrate with tiktoken or model-specific tokenizers.

## Implements

- [`Chunker`](../type-aliases/Chunker.md)

## Constructors

### Constructor

> **new TokenChunker**(): `TokenChunker`

#### Returns

`TokenChunker`

## Properties

### strategy

> `readonly` **strategy**: `"token"`

Defined in: [rag/chunking/tokenChunker.ts:25](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/tokenChunker.ts#L25)

Strategy name for identification

#### Implementation of

`Chunker.strategy`

## Methods

### chunk()

> **chunk**(`text`, `config?`): `Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Defined in: [rag/chunking/tokenChunker.ts:35](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/tokenChunker.ts#L35)

Split text into chunks

#### Parameters

##### text

`string`

The text to chunk

##### config?

[`TokenChunkerConfig`](../type-aliases/TokenChunkerConfig.md)

Strategy-specific configuration

#### Returns

`Promise`\<[`Chunk`](../type-aliases/Chunk.md)[]\>

Array of chunks

#### Implementation of

`Chunker.chunk`

---

### estimateTokenCount()

> **estimateTokenCount**(`text`, `tokenizer?`): `number`

Defined in: [rag/chunking/tokenChunker.ts:200](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/tokenChunker.ts#L200)

Estimate token count for text

#### Parameters

##### text

`string`

##### tokenizer?

`string` = `"cl100k_base"`

#### Returns

`number`

---

### validateConfig()

> **validateConfig**(`config`): [`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)

Defined in: [rag/chunking/tokenChunker.ts:204](https://github.com/juspay/neurolink/blob/release/src/lib/rag/chunking/tokenChunker.ts#L204)

#### Parameters

##### config

[`BaseChunkerConfig`](../type-aliases/BaseChunkerConfig.md)

#### Returns

[`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)
