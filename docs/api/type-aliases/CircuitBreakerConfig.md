[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerConfig

# Type Alias: CircuitBreakerConfig

> **CircuitBreakerConfig** = `object`

Circuit breaker configuration
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### failureThreshold

> **failureThreshold**: `number`

Number of failures before opening the circuit

---

### resetTimeout

> **resetTimeout**: `number`

Time to wait before attempting reset (milliseconds)

---

### halfOpenMaxCalls

> **halfOpenMaxCalls**: `number`

Maximum calls allowed in half-open state

---

### operationTimeout

> **operationTimeout**: `number`

Timeout for individual operations (milliseconds)

---

### minimumCallsBeforeCalculation

> **minimumCallsBeforeCalculation**: `number`

Minimum number of calls before calculating failure rate

---

### statisticsWindowSize

> **statisticsWindowSize**: `number`

Window size for calculating failure rate (milliseconds)
