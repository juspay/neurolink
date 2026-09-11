[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerManager

# Class: CircuitBreakerManager

Defined in: [mcp/mcpCircuitBreaker.ts:437](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L437)

Circuit breaker manager for multiple circuit breakers

## Constructors

### Constructor

> **new CircuitBreakerManager**(): `CircuitBreakerManager`

#### Returns

`CircuitBreakerManager`

## Methods

### getBreaker()

> **getBreaker**(`name`, `config?`): [`MCPCircuitBreaker`](MCPCircuitBreaker.md)

Defined in: [mcp/mcpCircuitBreaker.ts:443](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L443)

Get or create a circuit breaker

#### Parameters

##### name

`string`

##### config?

`Partial`\<[`CircuitBreakerConfig`](../type-aliases/CircuitBreakerConfig.md)\>

#### Returns

[`MCPCircuitBreaker`](MCPCircuitBreaker.md)

---

### removeBreaker()

> **removeBreaker**(`name`): `boolean`

Defined in: [mcp/mcpCircuitBreaker.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L466)

Remove a circuit breaker and clean up its resources

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### getBreakerNames()

> **getBreakerNames**(): `string`[]

Defined in: [mcp/mcpCircuitBreaker.ts:484](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L484)

Get all circuit breaker names

#### Returns

`string`[]

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, [`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)\>

Defined in: [mcp/mcpCircuitBreaker.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L491)

Get statistics for all circuit breakers

#### Returns

`Record`\<`string`, [`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)\>

---

### resetAll()

> **resetAll**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:504](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L504)

Reset all circuit breakers

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

Defined in: [mcp/mcpCircuitBreaker.ts:515](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L515)

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

Defined in: [mcp/mcpCircuitBreaker.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/mcpCircuitBreaker.ts#L557)

Destroy all circuit breakers and clean up their resources
This should be called during application shutdown to prevent memory leaks

#### Returns

`void`
