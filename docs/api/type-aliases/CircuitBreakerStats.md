[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerStats

# Type Alias: CircuitBreakerStats

> **CircuitBreakerStats** = `object`

Circuit breaker statistics
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### state

> **state**: [`CircuitBreakerState`](CircuitBreakerState.md)

Current state

---

### totalCalls

> **totalCalls**: `number`

Total number of calls

---

### successfulCalls

> **successfulCalls**: `number`

Number of successful calls

---

### failedCalls

> **failedCalls**: `number`

Number of failed calls

---

### failureRate

> **failureRate**: `number`

Current failure rate (0-1)

---

### windowCalls

> **windowCalls**: `number`

Calls in current time window

---

### lastStateChange

> **lastStateChange**: `Date`

Last state change timestamp

---

### nextRetryTime?

> `optional` **nextRetryTime?**: `Date`

Next retry time (for open state)

---

### halfOpenCalls

> **halfOpenCalls**: `number`

Half-open call count
