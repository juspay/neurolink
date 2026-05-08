[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerStats

# Type Alias: CircuitBreakerStats

> **CircuitBreakerStats** = `object`

Defined in: [types/mcp.ts:695](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L695)

Circuit breaker statistics
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### state

> **state**: [`CircuitBreakerState`](CircuitBreakerState.md)

Defined in: [types/mcp.ts:697](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L697)

Current state

---

### totalCalls

> **totalCalls**: `number`

Defined in: [types/mcp.ts:700](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L700)

Total number of calls

---

### successfulCalls

> **successfulCalls**: `number`

Defined in: [types/mcp.ts:703](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L703)

Number of successful calls

---

### failedCalls

> **failedCalls**: `number`

Defined in: [types/mcp.ts:706](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L706)

Number of failed calls

---

### failureRate

> **failureRate**: `number`

Defined in: [types/mcp.ts:709](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L709)

Current failure rate (0-1)

---

### windowCalls

> **windowCalls**: `number`

Defined in: [types/mcp.ts:712](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L712)

Calls in current time window

---

### lastStateChange

> **lastStateChange**: `Date`

Defined in: [types/mcp.ts:715](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L715)

Last state change timestamp

---

### nextRetryTime?

> `optional` **nextRetryTime?**: `Date`

Defined in: [types/mcp.ts:718](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L718)

Next retry time (for open state)

---

### halfOpenCalls

> **halfOpenCalls**: `number`

Defined in: [types/mcp.ts:721](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L721)

Half-open call count
