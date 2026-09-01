[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerEvents

# Type Alias: CircuitBreakerEvents

> **CircuitBreakerEvents** = `object`

Defined in: [types/mcp.ts:747](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L747)

Circuit breaker events
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### stateChange

> **stateChange**: `object`

Defined in: [types/mcp.ts:748](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L748)

#### oldState

> **oldState**: [`CircuitBreakerState`](CircuitBreakerState.md)

#### newState

> **newState**: [`CircuitBreakerState`](CircuitBreakerState.md)

#### reason

> **reason**: `string`

#### timestamp

> **timestamp**: `Date`

---

### callSuccess

> **callSuccess**: `object`

Defined in: [types/mcp.ts:755](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L755)

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### callFailure

> **callFailure**: `object`

Defined in: [types/mcp.ts:760](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L760)

#### error

> **error**: `string`

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### circuitOpen

> **circuitOpen**: `object`

Defined in: [types/mcp.ts:766](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L766)

#### failureRate

> **failureRate**: `number`

#### totalCalls

> **totalCalls**: `number`

#### timestamp

> **timestamp**: `Date`

---

### circuitHalfOpen

> **circuitHalfOpen**: `object`

Defined in: [types/mcp.ts:772](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L772)

#### timestamp

> **timestamp**: `Date`

---

### circuitClosed

> **circuitClosed**: `object`

Defined in: [types/mcp.ts:776](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L776)

#### timestamp

> **timestamp**: `Date`
