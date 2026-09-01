[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerConfig

# Type Alias: CircuitBreakerConfig

> **CircuitBreakerConfig** = `object`

Defined in: [types/mcp.ts:690](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L690)

Circuit breaker configuration
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### failureThreshold

> **failureThreshold**: `number`

Defined in: [types/mcp.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L692)

Number of failures before opening the circuit

---

### resetTimeout

> **resetTimeout**: `number`

Defined in: [types/mcp.ts:695](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L695)

Time to wait before attempting reset (milliseconds)

---

### halfOpenMaxCalls

> **halfOpenMaxCalls**: `number`

Defined in: [types/mcp.ts:698](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L698)

Maximum calls allowed in half-open state

---

### operationTimeout

> **operationTimeout**: `number`

Defined in: [types/mcp.ts:701](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L701)

Timeout for individual operations (milliseconds)

---

### minimumCallsBeforeCalculation

> **minimumCallsBeforeCalculation**: `number`

Defined in: [types/mcp.ts:704](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L704)

Minimum number of calls before calculating failure rate

---

### statisticsWindowSize

> **statisticsWindowSize**: `number`

Defined in: [types/mcp.ts:707](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L707)

Window size for calculating failure rate (milliseconds)
