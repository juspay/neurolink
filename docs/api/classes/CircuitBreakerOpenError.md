[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerOpenError

# Class: CircuitBreakerOpenError

Defined in: [types/circuitBreakerErrors.ts:14](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/circuitBreakerErrors.ts#L14)

Typed error thrown when a circuit breaker is open or half-open call limit is reached.
Contains structured metadata so callers can build actionable error messages
for AI models and downstream consumers.

## Extends

- `Error`

## Constructors

### Constructor

> **new CircuitBreakerOpenError**(`options`): `CircuitBreakerOpenError`

Defined in: [types/circuitBreakerErrors.ts:26](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/circuitBreakerErrors.ts#L26)

#### Parameters

##### options

###### breakerName

`string`

###### retryAfter

`Date`

###### retryAfterMs

`number`

###### breakerState

[`CircuitBreakerState`](../type-aliases/CircuitBreakerState.md)

###### failureCount

`number`

#### Returns

`CircuitBreakerOpenError`

#### Overrides

`Error.constructor`

## Properties

### breakerName

> `readonly` **breakerName**: `string`

Defined in: [types/circuitBreakerErrors.ts:16](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/circuitBreakerErrors.ts#L16)

The circuit breaker name (e.g., "tool-execution-bitbucket-server-add_comment")

---

### retryAfter

> `readonly` **retryAfter**: `string`

Defined in: [types/circuitBreakerErrors.ts:18](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/circuitBreakerErrors.ts#L18)

ISO timestamp when the circuit breaker will transition to half-open and allow a retry

---

### retryAfterMs

> `readonly` **retryAfterMs**: `number`

Defined in: [types/circuitBreakerErrors.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/circuitBreakerErrors.ts#L20)

Milliseconds until the circuit breaker will allow a retry

---

### breakerState

> `readonly` **breakerState**: [`CircuitBreakerState`](../type-aliases/CircuitBreakerState.md)

Defined in: [types/circuitBreakerErrors.ts:22](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/circuitBreakerErrors.ts#L22)

Current circuit breaker state ("open" or "half-open")

---

### failureCount

> `readonly` **failureCount**: `number`

Defined in: [types/circuitBreakerErrors.ts:24](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/circuitBreakerErrors.ts#L24)

Number of failures that caused the circuit to open
