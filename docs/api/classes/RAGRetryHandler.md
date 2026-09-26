[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGRetryHandler

# Class: RAGRetryHandler

RAG Retry Handler class for more complex retry scenarios

## Constructors

### Constructor

> **new RAGRetryHandler**(`config?`): `RAGRetryHandler`

#### Parameters

##### config?

`Partial`\<[`RAGRetryConfig`](../type-aliases/RAGRetryConfig.md)\> = `{}`

#### Returns

`RAGRetryHandler`

## Methods

### executeWithRetry()

> **executeWithRetry**\<`T`\>(`operation`, `maxRetries?`): `Promise`\<`T`\>

Execute an operation with retry logic

#### Type Parameters

##### T

`T`

#### Parameters

##### operation

() => `Promise`\<`T`\>

##### maxRetries?

`number`

#### Returns

`Promise`\<`T`\>

---

### executeBatch()

> **executeBatch**\<`T`, `R`\>(`items`, `operation`, `options?`): `Promise`\<\{ `successful`: `object`[]; `failed`: `object`[]; `successRate`: `number`; \}\>

Execute multiple operations with retry, collecting results
Returns successful results and failed operations with their errors

#### Type Parameters

##### T

`T`

##### R

`R`

#### Parameters

##### items

`T`[]

##### operation

(`item`, `index`) => `Promise`\<`R`\>

##### options?

###### concurrency?

`number`

###### continueOnError?

`boolean`

#### Returns

`Promise`\<\{ `successful`: `object`[]; `failed`: `object`[]; `successRate`: `number`; \}\>

---

### getConfig()

> **getConfig**(): [`RAGRetryConfig`](../type-aliases/RAGRetryConfig.md)

Get current configuration

#### Returns

[`RAGRetryConfig`](../type-aliases/RAGRetryConfig.md)

---

### updateConfig()

> **updateConfig**(`config`): `void`

Update configuration

#### Parameters

##### config

`Partial`\<[`RAGRetryConfig`](../type-aliases/RAGRetryConfig.md)\>

#### Returns

`void`
