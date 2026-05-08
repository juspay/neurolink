[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerEvents

# Type Alias: CircuitBreakerEvents

> **CircuitBreakerEvents** = `object`

Defined in: [types/mcp.ts:728](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L728)

Circuit breaker events
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### stateChange

> **stateChange**: `object`

Defined in: [types/mcp.ts:729](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L729)

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

Defined in: [types/mcp.ts:736](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L736)

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### callFailure

> **callFailure**: `object`

Defined in: [types/mcp.ts:741](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L741)

#### error

> **error**: `string`

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### circuitOpen

> **circuitOpen**: `object`

Defined in: [types/mcp.ts:747](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L747)

#### failureRate

> **failureRate**: `number`

#### totalCalls

> **totalCalls**: `number`

#### timestamp

> **timestamp**: `Date`

---

### circuitHalfOpen

> **circuitHalfOpen**: `object`

Defined in: [types/mcp.ts:753](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L753)

#### timestamp

> **timestamp**: `Date`

---

### circuitClosed

> **circuitClosed**: `object`

Defined in: [types/mcp.ts:757](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L757)

#### timestamp

> **timestamp**: `Date`
