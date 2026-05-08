[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkerRegistry

# Class: ChunkerRegistry

Defined in: [rag/chunking/chunkerRegistry.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L24)

Registry for chunking strategies
Follows NeuroLink's factory pattern with lazy initialization

## Constructors

### Constructor

> **new ChunkerRegistry**(): `ChunkerRegistry`

#### Returns

`ChunkerRegistry`

## Methods

### initialize()

> `static` **initialize**(): `void`

Defined in: [rag/chunking/chunkerRegistry.ts:31](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L31)

Initialize all built-in chunkers

#### Returns

`void`

---

### register()

> `static` **register**(`strategy`, `factory`): `void`

Defined in: [rag/chunking/chunkerRegistry.ts:58](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L58)

Register a custom chunker

#### Parameters

##### strategy

[`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)

Strategy name

##### factory

() => [`Chunker`](../type-aliases/Chunker.md)

Factory function that creates chunker instance

#### Returns

`void`

---

### get()

> `static` **get**(`strategy`): [`Chunker`](../type-aliases/Chunker.md)

Defined in: [rag/chunking/chunkerRegistry.ts:68](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L68)

Get a chunker by strategy name

#### Parameters

##### strategy

[`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)

Chunking strategy name

#### Returns

[`Chunker`](../type-aliases/Chunker.md)

Chunker instance

#### Throws

Error if strategy is not registered

---

### getAvailableStrategies()

> `static` **getAvailableStrategies**(): [`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)[]

Defined in: [rag/chunking/chunkerRegistry.ts:85](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L85)

Get all available chunking strategies

#### Returns

[`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)[]

Array of strategy names

---

### has()

> `static` **has**(`strategy`): `boolean`

Defined in: [rag/chunking/chunkerRegistry.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L95)

Check if a strategy is registered

#### Parameters

##### strategy

[`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)

Strategy name to check

#### Returns

`boolean`

True if strategy is registered

---

### getRecommendedStrategy()

> `static` **getRecommendedStrategy**(`contentType`): [`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)

Defined in: [rag/chunking/chunkerRegistry.ts:105](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L105)

Get strategy recommendation based on content type

#### Parameters

##### contentType

`string`

Document type or MIME type

#### Returns

[`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)

Recommended chunking strategy

---

### getDefaultConfig()

> `static` **getDefaultConfig**(`strategy`): `Record`\<`string`, `unknown`\>

Defined in: [rag/chunking/chunkerRegistry.ts:141](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L141)

Get default configuration for a strategy

#### Parameters

##### strategy

[`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)

Chunking strategy

#### Returns

`Record`\<`string`, `unknown`\>

Default configuration object

---

### reset()

> `static` **reset**(): `void`

Defined in: [rag/chunking/chunkerRegistry.ts:204](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/chunking/chunkerRegistry.ts#L204)

Reset the registry (useful for testing)

#### Returns

`void`
