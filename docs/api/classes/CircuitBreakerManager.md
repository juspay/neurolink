[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerManager

# Class: CircuitBreakerManager

Defined in: [mcp/mcpCircuitBreaker.ts:416](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L416)

Circuit breaker manager for multiple circuit breakers

## Constructors

### Constructor

> **new CircuitBreakerManager**(): `CircuitBreakerManager`

#### Returns

`CircuitBreakerManager`

## Methods

### getBreaker()

> **getBreaker**(`name`, `config?`): [`MCPCircuitBreaker`](MCPCircuitBreaker.md)

Defined in: [mcp/mcpCircuitBreaker.ts:422](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L422)

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

Defined in: [mcp/mcpCircuitBreaker.ts:445](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L445)

Remove a circuit breaker and clean up its resources

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### getBreakerNames()

> **getBreakerNames**(): `string`[]

Defined in: [mcp/mcpCircuitBreaker.ts:463](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L463)

Get all circuit breaker names

#### Returns

`string`[]

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, [`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)\>

Defined in: [mcp/mcpCircuitBreaker.ts:470](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L470)

Get statistics for all circuit breakers

#### Returns

`Record`\<`string`, [`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)\>

---

### resetAll()

> **resetAll**(): `void`

Defined in: [mcp/mcpCircuitBreaker.ts:483](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L483)

Reset all circuit breakers

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

Defined in: [mcp/mcpCircuitBreaker.ts:494](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L494)

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

Defined in: [mcp/mcpCircuitBreaker.ts:536](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/mcpCircuitBreaker.ts#L536)

Destroy all circuit breakers and clean up their resources
This should be called during application shutdown to prevent memory leaks

#### Returns

`void`
