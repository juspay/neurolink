[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPCircuitBreaker

# Class: MCPCircuitBreaker

Defined in: [mcp/mcpCircuitBreaker.ts:38](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L38)

MCPCircuitBreaker
Implements circuit breaker pattern for fault tolerance

## Extends

- `EventEmitter`

## Constructors

### Constructor

> **new MCPCircuitBreaker**(`name`, `config?`): `MCPCircuitBreaker`

Defined in: [mcp/mcpCircuitBreaker.ts:48](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L48)

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

Defined in: [mcp/mcpCircuitBreaker.ts:71](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L71)

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

Defined in: [mcp/mcpCircuitBreaker.ts:318](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L318)

Get current statistics

#### Returns

[`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)

---

### reset()

> **reset**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:347](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L347)

Manually reset the circuit breaker

#### Returns

`void`

---

### forceOpen()

> **forceOpen**(`reason?`): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:357](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L357)

Force open the circuit breaker

#### Parameters

##### reason?

`string` = `"Manual force open"`

#### Returns

`void`

---

### getName()

> **getName**(): `string`

Defined in: [mcp/mcpCircuitBreaker.ts:365](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L365)

Get circuit breaker name

#### Returns

`string`

---

### isOpen()

> **isOpen**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:372](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L372)

Check if circuit is open

#### Returns

`boolean`

---

### isClosed()

> **isClosed**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:379](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L379)

Check if circuit is closed

#### Returns

`boolean`

---

### isHalfOpen()

> **isHalfOpen**(): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:386](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L386)

Check if circuit is half-open

#### Returns

`boolean`

---

### destroy()

> **destroy**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:395](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L395)

Destroy the circuit breaker and clean up resources
This method should be called when the circuit breaker is no longer needed
to prevent memory leaks from the cleanup timer

#### Returns

`void`
