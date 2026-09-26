[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPCircuitBreaker

# Class: MCPCircuitBreaker

Defined in: [mcp/mcpCircuitBreaker.ts:38](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L38)

MCPCircuitBreaker
Implements circuit breaker pattern for fault tolerance

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new MCPCircuitBreaker**(`name`, `config?`): `MCPCircuitBreaker`

Defined in: [mcp/mcpCircuitBreaker.ts:48](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L48)

#### Parameters

##### name

`string`

##### config?

`Partial`\<[`CircuitBreakerConfig`](../type-aliases/CircuitBreakerConfig.md)\> = `{}`

#### Returns

`MCPCircuitBreaker`

#### Overrides

`EventEmitter.constructor`

## Methods

### execute()

> **execute**\<`T`\>(`operation`): `Promise`\<`T`\>

Defined in: [mcp/mcpCircuitBreaker.ts:91](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L91)

Execute an operation with circuit breaker protection.

`operation` is handed a `recordResolvedFailure` callback so it can flag a
_resolved_ result as a logical failure without throwing. This matters for
MCP tool calls: the client does not throw on a protocol error, it
resolves with `{ isError: true, ... }`. Before this callback existed,
such a call always fell through to the success path below — the breaker
could never open for a tool that only ever "fails" by resolving an error
result, and callers still need that resolved value returned as-is (not
replaced by a thrown transport error). Call `recordResolvedFailure()`
from inside `operation` when that resolved value represents a failure;
the call is still counted as a normal, non-throwing success from the
`Promise.race` below, so this callback is what tells `execute()`
otherwise. Callers that never call it see no behavior change.

#### Type Parameters

##### T

`T`

#### Parameters

##### operation

(`recordResolvedFailure`) => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

---

### getStats()

> **getStats**(): [`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)

Defined in: [mcp/mcpCircuitBreaker.ts:385](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L385)

Get current statistics

#### Returns

[`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)

---

### reset()

> **reset**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:414](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L414)

Manually reset the circuit breaker

#### Returns

`void`

---

### forceOpen()

> **forceOpen**(`reason?`): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:424](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L424)

Force open the circuit breaker

#### Parameters

##### reason?

`string` = `"Manual force open"`

#### Returns

`void`

---

### getName()

> **getName**(): `string`

Defined in: [mcp/mcpCircuitBreaker.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L432)

Get circuit breaker name

#### Returns

`string`

---

### isOpen()

> **isOpen**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L439)

Check if circuit is open

#### Returns

`boolean`

---

### isClosed()

> **isClosed**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:446](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L446)

Check if circuit is closed

#### Returns

`boolean`

---

### isHalfOpen()

> **isHalfOpen**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:453](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L453)

Check if circuit is half-open

#### Returns

`boolean`

---

### destroy()

> **destroy**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:462](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L462)

Destroy the circuit breaker and clean up resources
This method should be called when the circuit breaker is no longer needed
to prevent memory leaks from the cleanup timer

#### Returns

`void`
