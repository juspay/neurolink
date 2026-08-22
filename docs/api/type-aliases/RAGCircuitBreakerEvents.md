[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerEvents

# Type Alias: RAGCircuitBreakerEvents

> **RAGCircuitBreakerEvents** = `object`

Defined in: [types/rag.ts:634](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L634)

Event map for RAG circuit breaker.

## Properties

### stateChange

> **stateChange**: \[\{ `oldState`: [`CircuitState`](CircuitState.md); `newState`: [`CircuitState`](CircuitState.md); `reason`: `string`; `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:635](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L635)

---

### callSuccess

> **callSuccess**: \[\{ `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

Defined in: [types/rag.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L643)

---

### callFailure

> **callFailure**: \[\{ `error`: `string`; `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

Defined in: [types/rag.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L644)

---

### circuitOpen

> **circuitOpen**: \[\{ `failureRate`: `number`; `totalCalls`: `number`; `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:652](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L652)

---

### circuitHalfOpen

> **circuitHalfOpen**: \[\{ `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:653](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L653)

---

### circuitClosed

> **circuitClosed**: \[\{ `timestamp`: `Date`; \}\]

Defined in: [types/rag.ts:654](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L654)
