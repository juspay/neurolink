[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ObservabilityCircuitBreakerState

# Type Alias: ObservabilityCircuitBreakerState

> **ObservabilityCircuitBreakerState** = `object`

Runtime state for the observability exporter circuit breaker.
Prefixed to disambiguate from the richer MCP CircuitBreakerState in mcp.ts.

## Properties

### failures

> **failures**: `number`

---

### lastFailure

> **lastFailure**: `number`

---

### state

> **state**: `"closed"` \| `"open"` \| `"half-open"`
