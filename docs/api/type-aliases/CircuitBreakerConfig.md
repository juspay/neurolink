[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerConfig

# Type Alias: CircuitBreakerConfig

> **CircuitBreakerConfig** = `object`

Defined in: [types/mcp.ts:709](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L709)

Circuit breaker configuration
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### failureThreshold

> **failureThreshold**: `number`

Defined in: [types/mcp.ts:711](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L711)

Number of failures before opening the circuit

---

### resetTimeout

> **resetTimeout**: `number`

Defined in: [types/mcp.ts:714](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L714)

Time to wait before attempting reset (milliseconds)

---

### halfOpenMaxCalls

> **halfOpenMaxCalls**: `number`

Defined in: [types/mcp.ts:717](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L717)

Maximum calls allowed in half-open state

---

### operationTimeout

> **operationTimeout**: `number`

Defined in: [types/mcp.ts:720](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L720)

Timeout for individual operations (milliseconds)

---

### minimumCallsBeforeCalculation

> **minimumCallsBeforeCalculation**: `number`

Defined in: [types/mcp.ts:723](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L723)

Minimum number of calls before calculating failure rate

---

### statisticsWindowSize

> **statisticsWindowSize**: `number`

Defined in: [types/mcp.ts:726](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L726)

Window size for calculating failure rate (milliseconds)
