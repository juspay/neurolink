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

Defined in: [mcp/mcpCircuitBreaker.ts:78](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L78)

Execute an operation with circuit breaker protection

#### Type Parameters

##### T

`T`

#### Parameters

##### operation

() => `Promise`\<`T`\>

#### Returns

`Promise`\<`T`\>

---

### getStats()

> **getStats**(): [`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)

Defined in: [mcp/mcpCircuitBreaker.ts:339](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L339)

Get current statistics

#### Returns

[`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)

---

### reset()

> **reset**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:368](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L368)

Manually reset the circuit breaker

#### Returns

`void`

---

### forceOpen()

> **forceOpen**(`reason?`): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:378](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L378)

Force open the circuit breaker

#### Parameters

##### reason?

`string` = `"Manual force open"`

#### Returns

`void`

---

### getName()

> **getName**(): `string`

Defined in: [mcp/mcpCircuitBreaker.ts:386](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L386)

Get circuit breaker name

#### Returns

`string`

---

### isOpen()

> **isOpen**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L393)

Check if circuit is open

#### Returns

`boolean`

---

### isClosed()

> **isClosed**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:400](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L400)

Check if circuit is closed

#### Returns

`boolean`

---

### isHalfOpen()

> **isHalfOpen**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:407](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L407)

Check if circuit is half-open

#### Returns

`boolean`

---

### destroy()

> **destroy**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:416](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L416)

Destroy the circuit breaker and clean up resources
This method should be called when the circuit breaker is no longer needed
to prevent memory leaks from the cleanup timer

#### Returns

`void`
