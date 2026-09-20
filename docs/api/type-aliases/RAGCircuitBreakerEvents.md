[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerEvents

# Type Alias: RAGCircuitBreakerEvents

> **RAGCircuitBreakerEvents** = `object`

Defined in: [types/rag.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L672)

Event map for RAG circuit breaker.

## Properties

### stateChange

> **stateChange**: \[\{ `oldState`: [`CircuitState`](CircuitState.md); `newState`: [`CircuitState`](CircuitState.md); `reason`: `string`; `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L673)

---

### callSuccess

> **callSuccess**: \[\{ `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

Defined in: [types/rag.ts:681](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L681)

---

### callFailure

> **callFailure**: \[\{ `error`: `string`; `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

Defined in: [types/rag.ts:682](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L682)

---

### circuitOpen

> **circuitOpen**: \[\{ `failureRate`: `number`; `totalCalls`: `number`; `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L690)

---

### circuitHalfOpen

> **circuitHalfOpen**: \[\{ `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:691](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L691)

---

### circuitClosed

> **circuitClosed**: \[\{ `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L692)
