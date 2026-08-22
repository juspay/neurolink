[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerStats

# Type Alias: RAGCircuitBreakerStats

> **RAGCircuitBreakerStats** = `object`

Defined in: [types/rag.ts:208](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L208)

Circuit breaker statistics

## Properties

### state

> **state**: [`CircuitState`](CircuitState.md)

Defined in: [types/rag.ts:209](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L209)

---

### totalCalls

> **totalCalls**: `number`

Defined in: [types/rag.ts:210](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L210)

---

### successfulCalls

> **successfulCalls**: `number`

Defined in: [types/rag.ts:211](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L211)

---

### failedCalls

> **failedCalls**: `number`

Defined in: [types/rag.ts:212](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L212)

---

### failureRate

> **failureRate**: `number`

Defined in: [types/rag.ts:213](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L213)

---

### windowCalls

> **windowCalls**: `number`

Defined in: [types/rag.ts:214](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L214)

---

### lastStateChange

> **lastStateChange**: `Date`

Defined in: [types/rag.ts:215](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L215)

---

### nextRetryTime?

> `optional` **nextRetryTime?**: `Date`

Defined in: [types/rag.ts:216](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L216)

---

### halfOpenCalls

> **halfOpenCalls**: `number`

Defined in: [types/rag.ts:217](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L217)

---

### averageLatency

> **averageLatency**: `number`

Defined in: [types/rag.ts:218](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L218)

---

### p95Latency

> **p95Latency**: `number`

Defined in: [types/rag.ts:219](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/rag.ts#L219)
