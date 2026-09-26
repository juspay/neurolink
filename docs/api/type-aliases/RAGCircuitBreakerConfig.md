[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerConfig

# Type Alias: RAGCircuitBreakerConfig

> **RAGCircuitBreakerConfig** = `object`

Circuit breaker configuration

## Properties

### failureThreshold

> **failureThreshold**: `number`

Number of failures before opening circuit (default: 5)

---

### resetTimeout

> **resetTimeout**: `number`

Time in ms before attempting reset (default: 60000)

---

### halfOpenMaxCalls

> **halfOpenMaxCalls**: `number`

Max calls allowed in half-open state (default: 3)

---

### operationTimeout

> **operationTimeout**: `number`

Operation timeout in ms (default: 30000)

---

### minimumCallsBeforeCalculation

> **minimumCallsBeforeCalculation**: `number`

Minimum calls before calculating failure rate (default: 10)

---

### statisticsWindowSize

> **statisticsWindowSize**: `number`

Time window for statistics in ms (default: 300000 - 5 minutes)
