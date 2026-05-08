[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreaker

# Class: RAGCircuitBreaker

Defined in: [rag/resilience/CircuitBreaker.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L38)

RAG Circuit Breaker

Provides circuit breaker pattern implementation for RAG operations
with comprehensive statistics and event handling.

## Extends

- [`TypedEventEmitter`](TypedEventEmitter.md)\<[`RAGCircuitBreakerEvents`](../type-aliases/RAGCircuitBreakerEvents.md)\>

## Constructors

### Constructor

> **new RAGCircuitBreaker**(`name`, `config?`): `RAGCircuitBreaker`

Defined in: [rag/resilience/CircuitBreaker.ts:47](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L47)

#### Parameters

##### name

`string`

##### config?

`Partial`\<[`RAGCircuitBreakerConfig`](../type-aliases/RAGCircuitBreakerConfig.md)\> = `{}`

#### Returns

`RAGCircuitBreaker`

#### Overrides

[`TypedEventEmitter`](TypedEventEmitter.md).[`constructor`](TypedEventEmitter.md#constructor)

## Methods

### on()

> **on**\<`K`\>(`event`, `listener`): `this`

Defined in: [core/infrastructure/typedEventEmitter.ts:6](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/typedEventEmitter.ts#L6)

#### Type Parameters

##### K

`K` _extends_ keyof [`RAGCircuitBreakerEvents`](../type-aliases/RAGCircuitBreakerEvents.md)

#### Parameters

##### event

`K`

##### listener

(...`args`) => `void`

#### Returns

`this`

#### Inherited from

[`TypedEventEmitter`](TypedEventEmitter.md).[`on`](TypedEventEmitter.md#on)

---

### off()

> **off**\<`K`\>(`event`, `listener`): `this`

Defined in: [core/infrastructure/typedEventEmitter.ts:14](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/typedEventEmitter.ts#L14)

#### Type Parameters

##### K

`K` _extends_ keyof [`RAGCircuitBreakerEvents`](../type-aliases/RAGCircuitBreakerEvents.md)

#### Parameters

##### event

`K`

##### listener

(...`args`) => `void`

#### Returns

`this`

#### Inherited from

[`TypedEventEmitter`](TypedEventEmitter.md).[`off`](TypedEventEmitter.md#off)

---

### emit()

> **emit**\<`K`\>(`event`, ...`args`): `boolean`

Defined in: [core/infrastructure/typedEventEmitter.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/typedEventEmitter.ts#L22)

#### Type Parameters

##### K

`K` _extends_ keyof [`RAGCircuitBreakerEvents`](../type-aliases/RAGCircuitBreakerEvents.md)

#### Parameters

##### event

`K`

##### args

...[`RAGCircuitBreakerEvents`](../type-aliases/RAGCircuitBreakerEvents.md)\[`K`\]

#### Returns

`boolean`

#### Inherited from

[`TypedEventEmitter`](TypedEventEmitter.md).[`emit`](TypedEventEmitter.md#emit)

---

### once()

> **once**\<`K`\>(`event`, `listener`): `this`

Defined in: [core/infrastructure/typedEventEmitter.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/typedEventEmitter.ts#L26)

#### Type Parameters

##### K

`K` _extends_ keyof [`RAGCircuitBreakerEvents`](../type-aliases/RAGCircuitBreakerEvents.md)

#### Parameters

##### event

`K`

##### listener

(...`args`) => `void`

#### Returns

`this`

#### Inherited from

[`TypedEventEmitter`](TypedEventEmitter.md).[`once`](TypedEventEmitter.md#once)

---

### removeAllListeners()

> **removeAllListeners**\<`K`\>(`event?`): `this`

Defined in: [core/infrastructure/typedEventEmitter.ts:37](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/core/infrastructure/typedEventEmitter.ts#L37)

#### Type Parameters

##### K

`K` _extends_ keyof [`RAGCircuitBreakerEvents`](../type-aliases/RAGCircuitBreakerEvents.md)

#### Parameters

##### event?

`K`

#### Returns

`this`

#### Inherited from

[`TypedEventEmitter`](TypedEventEmitter.md).[`removeAllListeners`](TypedEventEmitter.md#removealllisteners)

---

### execute()

> **execute**\<`T`\>(`operation`, `operationType?`): `Promise`\<`T`\>

Defined in: [rag/resilience/CircuitBreaker.ts:61](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L61)

Execute an operation with circuit breaker protection

#### Type Parameters

##### T

`T`

#### Parameters

##### operation

() => `Promise`\<`T`\>

##### operationType?

`string`

#### Returns

`Promise`\<`T`\>

---

### getStats()

> **getStats**(): [`RAGCircuitBreakerStats`](../type-aliases/RAGCircuitBreakerStats.md)

Defined in: [rag/resilience/CircuitBreaker.ts:303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L303)

Get current statistics

#### Returns

[`RAGCircuitBreakerStats`](../type-aliases/RAGCircuitBreakerStats.md)

---

### reset()

> **reset**(): `void`

Defined in: [rag/resilience/CircuitBreaker.ts:344](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L344)

Manually reset the circuit breaker

#### Returns

`void`

---

### forceOpen()

> **forceOpen**(`reason?`): `void`

Defined in: [rag/resilience/CircuitBreaker.ts:354](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L354)

Force open the circuit breaker

#### Parameters

##### reason?

`string` = `"Manual force open"`

#### Returns

`void`

---

### getName()

> **getName**(): `string`

Defined in: [rag/resilience/CircuitBreaker.ts:362](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L362)

Get circuit breaker name

#### Returns

`string`

---

### isOpen()

> **isOpen**(): `boolean`

Defined in: [rag/resilience/CircuitBreaker.ts:369](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L369)

Check if circuit is open

#### Returns

`boolean`

---

### isClosed()

> **isClosed**(): `boolean`

Defined in: [rag/resilience/CircuitBreaker.ts:376](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L376)

Check if circuit is closed

#### Returns

`boolean`

---

### isHalfOpen()

> **isHalfOpen**(): `boolean`

Defined in: [rag/resilience/CircuitBreaker.ts:383](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L383)

Check if circuit is half-open

#### Returns

`boolean`

---

### getState()

> **getState**(): [`CircuitState`](../type-aliases/CircuitState.md)

Defined in: [rag/resilience/CircuitBreaker.ts:390](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L390)

Get current state

#### Returns

[`CircuitState`](../type-aliases/CircuitState.md)

---

### destroy()

> **destroy**(): `void`

Defined in: [rag/resilience/CircuitBreaker.ts:397](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L397)

Destroy the circuit breaker and clean up resources

#### Returns

`void`
