[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / CallRecord

# Type Alias: CallRecord

> **CallRecord** = `object`

Defined in: [types/mcp.ts:329](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L329)

Call record for circuit breaker statistics tracking.
Superset shape: MCP breaker uses {timestamp, success, duration};
RAG breaker also tracks `operationType` (optional, for routing and
metrics). Both import from here.

## Properties

### timestamp

> **timestamp**: `number`

Defined in: [types/mcp.ts:330](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L330)

---

### success

> **success**: `boolean`

Defined in: [types/mcp.ts:331](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L331)

---

### duration

> **duration**: `number`

Defined in: [types/mcp.ts:332](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L332)

---

### operationType?

> `optional` **operationType?**: `string`

Defined in: [types/mcp.ts:333](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L333)
