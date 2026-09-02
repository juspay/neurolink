[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CallRecord

# Type Alias: CallRecord

> **CallRecord** = `object`

Defined in: [types/mcp.ts:348](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L348)

Call record for circuit breaker statistics tracking.
Superset shape: MCP breaker uses {timestamp, success, duration};
RAG breaker also tracks `operationType` (optional, for routing and
metrics). Both import from here.

## Properties

### timestamp

> **timestamp**: `number`

Defined in: [types/mcp.ts:349](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L349)

---

### success

> **success**: `boolean`

Defined in: [types/mcp.ts:350](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L350)

---

### duration

> **duration**: `number`

Defined in: [types/mcp.ts:351](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L351)

---

### operationType?

> `optional` **operationType?**: `string`

Defined in: [types/mcp.ts:352](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L352)
