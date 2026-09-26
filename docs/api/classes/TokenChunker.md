[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenChunker

# Class: TokenChunker

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

#### Parameters

##### config

[`BaseChunkerConfig`](../type-aliases/BaseChunkerConfig.md)

#### Returns

[`ChunkerValidationResult`](../type-aliases/ChunkerValidationResult.md)
