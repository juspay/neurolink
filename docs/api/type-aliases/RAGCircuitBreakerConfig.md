[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RAGCircuitBreakerConfig

# Type Alias: RAGCircuitBreakerConfig

> **RAGCircuitBreakerConfig** = `object`

Defined in: [types/rag.ts:190](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L190)

Circuit breaker configuration

## Properties

### failureThreshold

> **failureThreshold**: `number`

Defined in: [types/rag.ts:192](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L192)

Number of failures before opening circuit (default: 5)

---

### resetTimeout

> **resetTimeout**: `number`

Defined in: [types/rag.ts:194](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L194)

Time in ms before attempting reset (default: 60000)

---

### halfOpenMaxCalls

> **halfOpenMaxCalls**: `number`

Defined in: [types/rag.ts:196](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L196)

Max calls allowed in half-open state (default: 3)

---

### operationTimeout

> **operationTimeout**: `number`

Defined in: [types/rag.ts:198](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L198)

Operation timeout in ms (default: 30000)

---

### minimumCallsBeforeCalculation

> **minimumCallsBeforeCalculation**: `number`

Defined in: [types/rag.ts:200](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L200)

Minimum calls before calculating failure rate (default: 10)

---

### statisticsWindowSize

> **statisticsWindowSize**: `number`

Defined in: [types/rag.ts:202](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/rag.ts#L202)

Time window for statistics in ms (default: 300000 - 5 minutes)
