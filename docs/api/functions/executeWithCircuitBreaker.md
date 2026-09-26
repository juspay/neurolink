[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / executeWithCircuitBreaker

# Function: executeWithCircuitBreaker()

> **executeWithCircuitBreaker**\<`T`\>(`breakerName`, `operation`, `operationType?`, `config?`): `Promise`\<`T`\>

Convenience function to execute with circuit breaker

## Type Parameters

### T

`T`

## Parameters

### breakerName

`string`

### operation

() => `Promise`\<`T`\>

### operationType?

`string`

### config?

`Partial`\<[`RAGCircuitBreakerConfig`](../type-aliases/RAGCircuitBreakerConfig.md)\>

## Returns

`Promise`\<`T`\>
