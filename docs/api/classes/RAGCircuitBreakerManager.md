[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerManager

# Class: RAGCircuitBreakerManager

Defined in: [rag/resilience/CircuitBreaker.ts:411](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L411)

Circuit breaker manager for RAG operations

## Constructors

### Constructor

> **new RAGCircuitBreakerManager**(): `RAGCircuitBreakerManager`

#### Returns

`RAGCircuitBreakerManager`

## Methods

### getBreaker()

> **getBreaker**(`name`, `config?`): [`RAGCircuitBreaker`](RAGCircuitBreaker.md)

Defined in: [rag/resilience/CircuitBreaker.ts:417](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L417)

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

Defined in: [rag/resilience/CircuitBreaker.ts:439](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L439)

Remove a circuit breaker

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### getBreakerNames()

> **getBreakerNames**(): `string`[]

Defined in: [rag/resilience/CircuitBreaker.ts:455](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L455)

Get all circuit breaker names

#### Returns

`string`[]

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, [`RAGCircuitBreakerStats`](../type-aliases/RAGCircuitBreakerStats.md)\>

Defined in: [rag/resilience/CircuitBreaker.ts:462](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L462)

Get statistics for all circuit breakers

#### Returns

`Record`\<`string`, [`RAGCircuitBreakerStats`](../type-aliases/RAGCircuitBreakerStats.md)\>

---

### resetAll()

> **resetAll**(): `void`

Defined in: [rag/resilience/CircuitBreaker.ts:473](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L473)

Reset all circuit breakers

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

Defined in: [rag/resilience/CircuitBreaker.ts:483](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L483)

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

Defined in: [rag/resilience/CircuitBreaker.ts:523](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L523)

Destroy all circuit breakers

#### Returns

`void`
