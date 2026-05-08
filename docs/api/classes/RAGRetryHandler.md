[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGRetryHandler

# Class: RAGRetryHandler

Defined in: [rag/resilience/RetryHandler.ts:221](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/RetryHandler.ts#L221)

RAG Retry Handler class for more complex retry scenarios

## Constructors

### Constructor

> **new RAGRetryHandler**(`config?`): `RAGRetryHandler`

Defined in: [rag/resilience/RetryHandler.ts:224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/RetryHandler.ts#L224)

#### Parameters

##### config?

`Partial`\<[`RAGRetryConfig`](../type-aliases/RAGRetryConfig.md)\> = `{}`

#### Returns

`RAGRetryHandler`

## Methods

### executeWithRetry()

> **executeWithRetry**\<`T`\>(`operation`, `maxRetries?`): `Promise`\<`T`\>

Defined in: [rag/resilience/RetryHandler.ts:231](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/RetryHandler.ts#L231)

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

Defined in: [rag/resilience/RetryHandler.ts:244](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/RetryHandler.ts#L244)

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

Defined in: [rag/resilience/RetryHandler.ts:294](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/RetryHandler.ts#L294)

Get current configuration

#### Returns

[`RAGRetryConfig`](../type-aliases/RAGRetryConfig.md)

---

### updateConfig()

> **updateConfig**(`config`): `void`

Defined in: [rag/resilience/RetryHandler.ts:301](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/RetryHandler.ts#L301)

Update configuration

#### Parameters

##### config

`Partial`\<[`RAGRetryConfig`](../type-aliases/RAGRetryConfig.md)\>

#### Returns

`void`
