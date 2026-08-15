[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / executeWithCircuitBreaker

# Function: executeWithCircuitBreaker()

> **executeWithCircuitBreaker**\<`T`\>(`breakerName`, `operation`, `operationType?`, `config?`): `Promise`\<`T`\>

Defined in: [rag/resilience/CircuitBreaker.ts:550](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/resilience/CircuitBreaker.ts#L550)

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
