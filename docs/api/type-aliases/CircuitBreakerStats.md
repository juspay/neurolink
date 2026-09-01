[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerStats

# Type Alias: CircuitBreakerStats

> **CircuitBreakerStats** = `object`

Defined in: [types/mcp.ts:733](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L733)

Circuit breaker statistics
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### state

> **state**: [`CircuitBreakerState`](CircuitBreakerState.md)

Defined in: [types/mcp.ts:735](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L735)

Current state

---

### totalCalls

> **totalCalls**: `number`

Defined in: [types/mcp.ts:738](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L738)

Total number of calls

---

### successfulCalls

> **successfulCalls**: `number`

Defined in: [types/mcp.ts:741](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L741)

Number of successful calls

---

### failedCalls

> **failedCalls**: `number`

Defined in: [types/mcp.ts:744](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L744)

Number of failed calls

---

### failureRate

> **failureRate**: `number`

Defined in: [types/mcp.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L747)

Current failure rate (0-1)

---

### windowCalls

> **windowCalls**: `number`

Defined in: [types/mcp.ts:750](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L750)

Calls in current time window

---

### lastStateChange

> **lastStateChange**: `Date`

Defined in: [types/mcp.ts:753](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L753)

Last state change timestamp

---

### nextRetryTime?

> `optional` **nextRetryTime?**: `Date`

Defined in: [types/mcp.ts:756](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L756)

Next retry time (for open state)

---

### halfOpenCalls

> **halfOpenCalls**: `number`

Defined in: [types/mcp.ts:759](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L759)

Half-open call count
