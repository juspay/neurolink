[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / executeWithCircuitBreaker

# Function: executeWithCircuitBreaker()

> **executeWithCircuitBreaker**\<`T`\>(`breakerName`, `operation`, `operationType?`, `config?`): `Promise`\<`T`\>

Defined in: [rag/resilience/CircuitBreaker.ts:550](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/resilience/CircuitBreaker.ts#L550)

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
