[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerEvents

# Type Alias: RAGCircuitBreakerEvents

> **RAGCircuitBreakerEvents** = `object`

Event map for RAG circuit breaker.

## Properties

### stateChange

> **stateChange**: \[\{ `oldState`: [`CircuitState`](CircuitState.md); `newState`: [`CircuitState`](CircuitState.md); `reason`: `string`; `timestamp`: `Date`; \}\]

---

### callSuccess

> **callSuccess**: \[\{ `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

---

### callFailure

> **callFailure**: \[\{ `error`: `string`; `duration`: `number`; `timestamp`: `Date`; `operationType?`: `string`; \}\]

---

### circuitOpen

> **circuitOpen**: \[\{ `failureRate`: `number`; `totalCalls`: `number`; `timestamp`: `Date`; \}\]

---

### circuitHalfOpen

> **circuitHalfOpen**: \[\{ `timestamp`: `Date`; \}\]

---

### circuitClosed

> **circuitClosed**: \[\{ `timestamp`: `Date`; \}\]
