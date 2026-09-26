[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerEvents

# Type Alias: CircuitBreakerEvents

> **CircuitBreakerEvents** = `object`

Circuit breaker events
Moved from src/lib/mcp/mcpCircuitBreaker.ts

## Properties

### stateChange

> **stateChange**: `object`

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

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### callFailure

> **callFailure**: `object`

#### error

> **error**: `string`

#### duration

> **duration**: `number`

#### timestamp

> **timestamp**: `Date`

---

### circuitOpen

> **circuitOpen**: `object`

#### failureRate

> **failureRate**: `number`

#### totalCalls

> **totalCalls**: `number`

#### timestamp

> **timestamp**: `Date`

---

### circuitHalfOpen

> **circuitHalfOpen**: `object`

#### timestamp

> **timestamp**: `Date`

---

### circuitClosed

> **circuitClosed**: `object`

#### timestamp

> **timestamp**: `Date`
