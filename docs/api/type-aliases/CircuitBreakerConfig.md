[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerConfig

# Type Alias: CircuitBreakerConfig

> **CircuitBreakerConfig** = `object`

Defined in: [types/mcp.ts:671](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L671)

Circuit breaker configuration
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### failureThreshold

> **failureThreshold**: `number`

Defined in: [types/mcp.ts:673](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L673)

Number of failures before opening the circuit

---

### resetTimeout

> **resetTimeout**: `number`

Defined in: [types/mcp.ts:676](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L676)

Time to wait before attempting reset (milliseconds)

---

### halfOpenMaxCalls

> **halfOpenMaxCalls**: `number`

Defined in: [types/mcp.ts:679](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L679)

Maximum calls allowed in half-open state

---

### operationTimeout

> **operationTimeout**: `number`

Defined in: [types/mcp.ts:682](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L682)

Timeout for individual operations (milliseconds)

---

### minimumCallsBeforeCalculation

> **minimumCallsBeforeCalculation**: `number`

Defined in: [types/mcp.ts:685](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L685)

Minimum number of calls before calculating failure rate

---

### statisticsWindowSize

> **statisticsWindowSize**: `number`

Defined in: [types/mcp.ts:688](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L688)

Window size for calculating failure rate (milliseconds)
