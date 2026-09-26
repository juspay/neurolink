[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreaker

# Class: RAGCircuitBreaker

RAG Circuit Breaker

Provides circuit breaker pattern implementation for RAG operations
with comprehensive statistics and event handling.

## Extends

- [`TypedEventEmitter`](TypedEventEmitter.md)\<[`RAGCircuitBreakerEvents`](../type-aliases/RAGCircuitBreakerEvents.md)\>

## Constructors

### Constructor

> **new RAGCircuitBreaker**(`name`, `config?`): `RAGCircuitBreaker`

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

Get current statistics

#### Returns

[`RAGCircuitBreakerStats`](../type-aliases/RAGCircuitBreakerStats.md)

---

### reset()

> **reset**(): `void`

Manually reset the circuit breaker

#### Returns

`void`

---

### forceOpen()

> **forceOpen**(`reason?`): `void`

Force open the circuit breaker

#### Parameters

##### reason?

`string` = `"Manual force open"`

#### Returns

`void`

---

### getName()

> **getName**(): `string`

Get circuit breaker name

#### Returns

`string`

---

### isOpen()

> **isOpen**(): `boolean`

Check if circuit is open

#### Returns

`boolean`

---

### isClosed()

> **isClosed**(): `boolean`

Check if circuit is closed

#### Returns

`boolean`

---

### isHalfOpen()

> **isHalfOpen**(): `boolean`

Check if circuit is half-open

#### Returns

`boolean`

---

### getState()

> **getState**(): [`CircuitState`](../type-aliases/CircuitState.md)

Get current state

#### Returns

[`CircuitState`](../type-aliases/CircuitState.md)

---

### destroy()

> **destroy**(): `void`

Destroy the circuit breaker and clean up resources

#### Returns

`void`
