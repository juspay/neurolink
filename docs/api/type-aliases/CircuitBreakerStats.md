[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerStats

# Type Alias: CircuitBreakerStats

> **CircuitBreakerStats** = `object`

Defined in: [types/mcp.ts:714](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L714)

Circuit breaker statistics
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### state

> **state**: [`CircuitBreakerState`](CircuitBreakerState.md)

Defined in: [types/mcp.ts:716](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L716)

Current state

---

### totalCalls

> **totalCalls**: `number`

Defined in: [types/mcp.ts:719](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L719)

Total number of calls

---

### successfulCalls

> **successfulCalls**: `number`

Defined in: [types/mcp.ts:722](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L722)

Number of successful calls

---

### failedCalls

> **failedCalls**: `number`

Defined in: [types/mcp.ts:725](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L725)

Number of failed calls

---

### failureRate

> **failureRate**: `number`

Defined in: [types/mcp.ts:728](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L728)

Current failure rate (0-1)

---

### windowCalls

> **windowCalls**: `number`

Defined in: [types/mcp.ts:731](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L731)

Calls in current time window

---

### lastStateChange

> **lastStateChange**: `Date`

Defined in: [types/mcp.ts:734](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L734)

Last state change timestamp

---

### nextRetryTime?

> `optional` **nextRetryTime?**: `Date`

Defined in: [types/mcp.ts:737](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L737)

Next retry time (for open state)

---

### halfOpenCalls

> **halfOpenCalls**: `number`

Defined in: [types/mcp.ts:740](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L740)

Half-open call count
