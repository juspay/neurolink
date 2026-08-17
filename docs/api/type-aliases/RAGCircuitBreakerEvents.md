[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerEvents

# Type Alias: RAGCircuitBreakerEvents

> **RAGCircuitBreakerEvents** = `object`

Defined in: [types/rag.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L653)

Event map for RAG circuit breaker.

## Properties

### stateChange

> **stateChange**: \[\{ `oldState`: [`CircuitState`](CircuitState.md); `newState`: [`CircuitState`](CircuitState.md); `reason`: `string`; `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L654)

---

### callSuccess

> **callSuccess**: \[\{ `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

Defined in: [types/rag.ts:662](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L662)

---

### callFailure

> **callFailure**: \[\{ `error`: `string`; `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

Defined in: [types/rag.ts:663](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L663)

---

### circuitOpen

> **circuitOpen**: \[\{ `failureRate`: `number`; `totalCalls`: `number`; `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:671](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L671)

---

### circuitHalfOpen

> **circuitHalfOpen**: \[\{ `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:672](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L672)

---

### circuitClosed

> **circuitClosed**: \[\{ `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:673](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L673)
