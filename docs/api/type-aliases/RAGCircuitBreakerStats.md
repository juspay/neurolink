[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerStats

# Type Alias: RAGCircuitBreakerStats

> **RAGCircuitBreakerStats** = `object`

Defined in: [types/rag.ts:206](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L206)

Circuit breaker statistics

## Properties

### state

> **state**: [`CircuitState`](CircuitState.md)

Defined in: [types/rag.ts:207](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L207)

---

### totalCalls

> **totalCalls**: `number`

Defined in: [types/rag.ts:208](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L208)

---

### successfulCalls

> **successfulCalls**: `number`

Defined in: [types/rag.ts:209](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L209)

---

### failedCalls

> **failedCalls**: `number`

Defined in: [types/rag.ts:210](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L210)

---

### failureRate

> **failureRate**: `number`

Defined in: [types/rag.ts:211](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L211)

---

### windowCalls

> **windowCalls**: `number`

Defined in: [types/rag.ts:212](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L212)

---

### lastStateChange

> **lastStateChange**: `Date`

Defined in: [types/rag.ts:213](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L213)

---

### nextRetryTime?

> `optional` **nextRetryTime?**: `Date`

Defined in: [types/rag.ts:214](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L214)

---

### halfOpenCalls

> **halfOpenCalls**: `number`

Defined in: [types/rag.ts:215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L215)

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/rag.ts:216](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L216)

---

### p95Latency

> **p95Latency**: `number`

Defined in: [types/rag.ts:217](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/rag.ts#L217)
