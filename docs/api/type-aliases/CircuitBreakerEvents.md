[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerEvents

# Type Alias: CircuitBreakerEvents

> **CircuitBreakerEvents** = `object`

Defined in: [types/mcp.ts:766](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L766)

Circuit breaker events
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### stateChange

> **stateChange**: `object`

Defined in: [types/mcp.ts:767](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L767)

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

Defined in: [types/mcp.ts:774](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L774)

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### callFailure

> **callFailure**: `object`

Defined in: [types/mcp.ts:779](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L779)

#### error

> **error**: `string`

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### circuitOpen

> **circuitOpen**: `object`

Defined in: [types/mcp.ts:785](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L785)

#### failureRate

> **failureRate**: `number`

#### totalCalls

> **totalCalls**: `number`

#### timestamp

> **timestamp**: `Date`

---

### circuitHalfOpen

> **circuitHalfOpen**: `object`

Defined in: [types/mcp.ts:791](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L791)

#### timestamp

> **timestamp**: `Date`

---

### circuitClosed

> **circuitClosed**: `object`

Defined in: [types/mcp.ts:795](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L795)

#### timestamp

> **timestamp**: `Date`
