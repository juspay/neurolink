[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerStats

# Type Alias: RAGCircuitBreakerStats

> **RAGCircuitBreakerStats** = `object`

Circuit breaker statistics

## Properties

### state

> **state**: [`CircuitState`](CircuitState.md)

---

### totalCalls

> **totalCalls**: `number`

---

### successfulCalls

> **successfulCalls**: `number`

---

### failedCalls

> **failedCalls**: `number`

---

### failureRate

> **failureRate**: `number`

---

### windowCalls

> **windowCalls**: `number`

---

### lastStateChange

> **lastStateChange**: `Date`

---

### nextRetryTime?

> `optional` **nextRetryTime?**: `Date`

---

### halfOpenCalls

> **halfOpenCalls**: `number`

---

### averageLatency

> **averageLatency**: `number`

---

### p95Latency

> **p95Latency**: `number`
