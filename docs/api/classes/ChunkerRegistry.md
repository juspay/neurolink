[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ChunkerRegistry

# Class: ChunkerRegistry

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

Initialize all built-in chunkers

#### Returns

`void`

---

### register()

> `static` **register**(`strategy`, `factory`): `void`

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

Get all available chunking strategies

#### Returns

[`ChunkingStrategy`](../type-aliases/ChunkingStrategy.md)[]

Array of strategy names

---

### has()

> `static` **has**(`strategy`): `boolean`

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

Reset the registry (useful for testing)

#### Returns

`void`
