[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CircuitBreakerManager

# Class: CircuitBreakerManager

Circuit breaker manager for multiple circuit breakers

## Constructors

### Constructor

> **new CircuitBreakerManager**(): `CircuitBreakerManager`

#### Returns

`CircuitBreakerManager`

## Methods

### getBreaker()

> **getBreaker**(`name`, `config?`): [`MCPCircuitBreaker`](MCPCircuitBreaker.md)

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

Remove a circuit breaker and clean up its resources

#### Parameters

##### name

`string`

#### Returns

`boolean`

---

### getBreakerNames()

> **getBreakerNames**(): `string`[]

Get all circuit breaker names

#### Returns

`string`[]

---

### getAllStats()

> **getAllStats**(): `Record`\<`string`, [`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)\>

Get statistics for all circuit breakers

#### Returns

`Record`\<`string`, [`CircuitBreakerStats`](../type-aliases/CircuitBreakerStats.md)\>

---

### resetAll()

> **resetAll**(): `void`

Reset all circuit breakers

#### Returns

`void`

---

### getHealthSummary()

> **getHealthSummary**(): `object`

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

Destroy all circuit breakers and clean up their resources
This should be called during application shutdown to prevent memory leaks

#### Returns

`void`
