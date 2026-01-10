[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPCircuitBreaker

# Class: MCPCircuitBreaker

Defined in: [mcp/mcpCircuitBreaker.ts:21](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L21)

MCPCircuitBreaker
Implements circuit breaker pattern for fault tolerance

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new MCPCircuitBreaker**(`name`, `config`): `MCPCircuitBreaker`

Defined in: [mcp/mcpCircuitBreaker.ts:31](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L31)

#### Parameters

##### name

`string`

##### config

`Partial`\<`CircuitBreakerConfig`\> = `{}`

#### Returns

`MCPCircuitBreaker`

#### Overrides

`EventEmitter.constructor`

## Methods

### execute()

> **execute**\<`T`\>(`operation`): `Promise`\<`T`\>

Defined in: [mcp/mcpCircuitBreaker.ts:54](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L54)

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

> **getStats**(): `CircuitBreakerStats`

Defined in: [mcp/mcpCircuitBreaker.ts:257](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L257)

Get current statistics

#### Returns

`CircuitBreakerStats`

---

### reset()

> **reset**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:286](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L286)

Manually reset the circuit breaker

#### Returns

`void`

---

### forceOpen()

> **forceOpen**(`reason`): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:296](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L296)

Force open the circuit breaker

#### Parameters

##### reason

`string` = `"Manual force open"`

#### Returns

`void`

---

### getName()

> **getName**(): `string`

Defined in: [mcp/mcpCircuitBreaker.ts:304](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L304)

Get circuit breaker name

#### Returns

`string`

---

### isOpen()

> **isOpen**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:311](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L311)

Check if circuit is open

#### Returns

`boolean`

---

### isClosed()

> **isClosed**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:318](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L318)

Check if circuit is closed

#### Returns

`boolean`

---

### isHalfOpen()

> **isHalfOpen**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:325](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L325)

Check if circuit is half-open

#### Returns

`boolean`

---

### destroy()

> **destroy**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:334](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L334)

Destroy the circuit breaker and clean up resources
This method should be called when the circuit breaker is no longer needed
to prevent memory leaks from the cleanup timer

#### Returns

`void`
