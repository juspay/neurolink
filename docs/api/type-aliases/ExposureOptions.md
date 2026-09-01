[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposureOptions

# Type Alias: ExposureOptions

> **ExposureOptions** = `object`

Defined in: [types/mcp.ts:1233](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1233)

Options for exposing agents/workflows as MCP tools

## Properties

### prefix?

> `optional` **prefix?**: `string`

Defined in: [types/mcp.ts:1237](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1237)

Prefix for tool names

---

### defaultAnnotations?

> `optional` **defaultAnnotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/mcp.ts:1242](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1242)

Default annotations for all exposed tools

---

### includeMetadataInDescription?

> `optional` **includeMetadataInDescription?**: `boolean`

Defined in: [types/mcp.ts:1247](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1247)

Whether to include metadata in tool description

---

### nameTransformer?

> `optional` **nameTransformer?**: (`name`) => `string`

Defined in: [types/mcp.ts:1252](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1252)

Custom name transformer

#### Parameters

##### name

`string`

#### Returns

`string`

---

### wrapWithContext?

> `optional` **wrapWithContext?**: `boolean`

Defined in: [types/mcp.ts:1257](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1257)

Add execution context wrapper

---

### executionTimeout?

> `optional` **executionTimeout?**: `number`

Defined in: [types/mcp.ts:1262](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1262)

Timeout for agent/workflow execution (ms)

---

### enableLogging?

> `optional` **enableLogging?**: `boolean`

Defined in: [types/mcp.ts:1267](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1267)

Enable execution logging
