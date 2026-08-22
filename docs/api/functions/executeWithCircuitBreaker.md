[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / executeWithCircuitBreaker

# Function: executeWithCircuitBreaker()

> **executeWithCircuitBreaker**\<`T`\>(`breakerName`, `operation`, `operationType?`, `config?`): `Promise`\<`T`\>

Defined in: [rag/resilience/CircuitBreaker.ts:550](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/rag/resilience/CircuitBreaker.ts#L550)

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
