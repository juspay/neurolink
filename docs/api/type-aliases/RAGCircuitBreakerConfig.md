[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerConfig

# Type Alias: RAGCircuitBreakerConfig

> **RAGCircuitBreakerConfig** = `object`

Defined in: [types/rag.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L191)

Circuit breaker configuration

## Properties

### failureThreshold

> **failureThreshold**: `number`

Defined in: [types/rag.ts:193](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L193)

Number of failures before opening circuit (default: 5)

---

### resetTimeout

> **resetTimeout**: `number`

Defined in: [types/rag.ts:195](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L195)

Time in ms before attempting reset (default: 60000)

---

### halfOpenMaxCalls

> **halfOpenMaxCalls**: `number`

Defined in: [types/rag.ts:197](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L197)

Max calls allowed in half-open state (default: 3)

---

### operationTimeout

> **operationTimeout**: `number`

Defined in: [types/rag.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L199)

Operation timeout in ms (default: 30000)

---

### minimumCallsBeforeCalculation

> **minimumCallsBeforeCalculation**: `number`

Defined in: [types/rag.ts:201](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L201)

Minimum calls before calculating failure rate (default: 10)

---

### statisticsWindowSize

> **statisticsWindowSize**: `number`

Defined in: [types/rag.ts:203](https://github.com/juspay/neurolink/blob/release/src/lib/types/rag.ts#L203)

Time window for statistics in ms (default: 300000 - 5 minutes)
