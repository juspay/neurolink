[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerEvents

# Type Alias: RAGCircuitBreakerEvents

> **RAGCircuitBreakerEvents** = `object`

Defined in: [types/rag.ts:587](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L587)

Event map for RAG circuit breaker.

## Properties

### stateChange

> **stateChange**: \[\{ `oldState`: [`CircuitState`](CircuitState.md); `newState`: [`CircuitState`](CircuitState.md); `reason`: `string`; `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:588](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L588)

---

### callSuccess

> **callSuccess**: \[\{ `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

Defined in: [types/rag.ts:596](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L596)

---

### callFailure

> **callFailure**: \[\{ `error`: `string`; `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

Defined in: [types/rag.ts:597](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L597)

---

### circuitOpen

> **circuitOpen**: \[\{ `failureRate`: `number`; `totalCalls`: `number`; `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:605](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L605)

---

### circuitHalfOpen

> **circuitHalfOpen**: \[\{ `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:606](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L606)

---

### circuitClosed

> **circuitClosed**: \[\{ `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:607](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L607)
