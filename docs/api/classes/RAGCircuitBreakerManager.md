[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerManager

# Class: RAGCircuitBreakerManager

Circuit breaker manager for RAG operations

## Constructors

### Constructor

> **new RAGCircuitBreakerManager**(): `RAGCircuitBreakerManager`

#### Returns

`RAGCircuitBreakerManager`

## Methods

### getBreaker()

> **getBreaker**(`name`, `config?`): [`RAGCircuitBreaker`](RAGCircuitBreaker.md)

Get or create a circuit breaker

#### Parameters

##### name

`string`

##### config?

`Partial`\<[`RAGCircuitBreakerConfig`](../type-aliases/RAGCircuitBreakerConfig.md)\>

#### Returns

[`RAGCircuitBreaker`](RAGCircuitBreaker.md)

---

### removeBreaker()

> **removeBreaker**(`name`): `boolean`

Remove a circuit breaker

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### getBreakerNames()

> **getBreakerNames**(): `string`[]

Get all circuit breaker names

#### Returns

`string`[]

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, [`RAGCircuitBreakerStats`](../type-aliases/RAGCircuitBreakerStats.md)\>

Get statistics for all circuit breakers

#### Returns

`Record`\<`string`, [`RAGCircuitBreakerStats`](../type-aliases/RAGCircuitBreakerStats.md)\>

---

### resetAll()

> **resetAll**(): `void`

Reset all circuit breakers

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

Get health summary

#### Returns

`object`

##### totalBreakers

> **totalBreakers**: `number`

##### closedBreakers

> **closedBreakers**: `number`

##### openBreakers

> **openBreakers**: `number`

##### halfOpenBreakers

> **halfOpenBreakers**: `number`

##### unhealthyBreakers

> **unhealthyBreakers**: `string`[]

---

### destroyAll()

> **destroyAll**(): `void`

Destroy all circuit breakers

#### Returns

`void`
