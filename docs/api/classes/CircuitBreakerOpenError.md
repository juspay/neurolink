[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerOpenError

# Class: CircuitBreakerOpenError

Typed error thrown when a circuit breaker is open or half-open call limit is reached.
Contains structured metadata so callers can build actionable error messages
for AI models and downstream consumers.

## Extends

- `Error`

## Constructors

### Constructor

> **new CircuitBreakerOpenError**(`options`): `CircuitBreakerOpenError`

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

The circuit breaker name (e.g., "tool-execution-bitbucket-server-add_comment")

---

### retryAfter

> `readonly` **retryAfter**: `string`

ISO timestamp when the circuit breaker will transition to half-open and allow a retry

---

### retryAfterMs

> `readonly` **retryAfterMs**: `number`

Milliseconds until the circuit breaker will allow a retry

---

### breakerState

> `readonly` **breakerState**: [`CircuitBreakerState`](../type-aliases/CircuitBreakerState.md)

Current circuit breaker state ("open" or "half-open")

---

### failureCount

> `readonly` **failureCount**: `number`

Number of failures that caused the circuit to open
