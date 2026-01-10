[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerManager

# Class: CircuitBreakerManager

Defined in: [mcp/mcpCircuitBreaker.ts:355](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L355)

Circuit breaker manager for multiple circuit breakers

## Constructors

### Constructor

> **new CircuitBreakerManager**(): `CircuitBreakerManager`

#### Returns

`CircuitBreakerManager`

## Methods

### getBreaker()

> **getBreaker**(`name`, `config?`): [`MCPCircuitBreaker`](MCPCircuitBreaker.md)

Defined in: [mcp/mcpCircuitBreaker.ts:361](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L361)

Get or create a circuit breaker

#### Parameters

##### name

`string`

##### config?

`Partial`\<`CircuitBreakerConfig`\>

#### Returns

[`MCPCircuitBreaker`](MCPCircuitBreaker.md)

---

### removeBreaker()

> **removeBreaker**(`name`): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:384](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L384)

Remove a circuit breaker and clean up its resources

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### getBreakerNames()

> **getBreakerNames**(): `string`[]

Defined in: [mcp/mcpCircuitBreaker.ts:402](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L402)

Get all circuit breaker names

#### Returns

`string`[]

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, `CircuitBreakerStats`\>

Defined in: [mcp/mcpCircuitBreaker.ts:409](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L409)

Get statistics for all circuit breakers

#### Returns

`Record`\<`string`, `CircuitBreakerStats`\>

---

### resetAll()

> **resetAll**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:422](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L422)

Reset all circuit breakers

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

Defined in: [mcp/mcpCircuitBreaker.ts:433](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L433)

Get health summary

#### Returns

`object`

##### totalBreakers

> **totalBreakers**: `number`

##### closedBreakers

> **closedBreakers**: `number`

##### openBreakers

> **openBreakers**: `number`

##### halfOpenBreakers

> **halfOpenBreakers**: `number`

##### unhealthyBreakers

> **unhealthyBreakers**: `string`[]

---

### destroyAll()

> **destroyAll**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:475](https://github.com/juspay/neurolink/blob/1be79595b7d7307795c98da4267c1728cb50033d/src/lib/mcp/mcpCircuitBreaker.ts#L475)

Destroy all circuit breakers and clean up their resources
This should be called during application shutdown to prevent memory leaks

#### Returns

`void`
