[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerConfig

# Type Alias: RAGCircuitBreakerConfig

> **RAGCircuitBreakerConfig** = `object`

Defined in: [types/rag.ts:188](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L188)

Circuit breaker configuration

## Properties

### failureThreshold

> **failureThreshold**: `number`

Defined in: [types/rag.ts:190](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L190)

Number of failures before opening circuit (default: 5)

---

### resetTimeout

> **resetTimeout**: `number`

Defined in: [types/rag.ts:192](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L192)

Time in ms before attempting reset (default: 60000)

---

### halfOpenMaxCalls

> **halfOpenMaxCalls**: `number`

Defined in: [types/rag.ts:194](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L194)

Max calls allowed in half-open state (default: 3)

---

### operationTimeout

> **operationTimeout**: `number`

Defined in: [types/rag.ts:196](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L196)

Operation timeout in ms (default: 30000)

---

### minimumCallsBeforeCalculation

> **minimumCallsBeforeCalculation**: `number`

Defined in: [types/rag.ts:198](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L198)

Minimum calls before calculating failure rate (default: 10)

---

### statisticsWindowSize

> **statisticsWindowSize**: `number`

Defined in: [types/rag.ts:200](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L200)

Time window for statistics in ms (default: 300000 - 5 minutes)
