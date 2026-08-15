[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ObservabilityCircuitBreakerState

# Type Alias: ObservabilityCircuitBreakerState

> **ObservabilityCircuitBreakerState** = `object`

Defined in: [types/observability.ts:504](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L504)

Runtime state for the observability exporter circuit breaker.
Prefixed to disambiguate from the richer MCP CircuitBreakerState in mcp.ts.

## Properties

### failures

> **failures**: `number`

Defined in: [types/observability.ts:505](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L505)

---

### lastFailure

> **lastFailure**: `number`

Defined in: [types/observability.ts:506](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L506)

---

### state

> **state**: `"closed"` \| `"open"` \| `"half-open"`

Defined in: [types/observability.ts:507](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L507)
