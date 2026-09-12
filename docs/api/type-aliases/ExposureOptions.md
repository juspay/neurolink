[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposureOptions

# Type Alias: ExposureOptions

> **ExposureOptions** = `object`

Defined in: [types/mcp.ts:1252](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1252)

Options for exposing agents/workflows as MCP tools

## Properties

### prefix?

> `optional` **prefix?**: `string`

Defined in: [types/mcp.ts:1256](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1256)

Prefix for tool names

---

### defaultAnnotations?

> `optional` **defaultAnnotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/mcp.ts:1261](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1261)

Default annotations for all exposed tools

---

### includeMetadataInDescription?

> `optional` **includeMetadataInDescription?**: `boolean`

Defined in: [types/mcp.ts:1266](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1266)

Whether to include metadata in tool description

---

### nameTransformer?

> `optional` **nameTransformer?**: (`name`) => `string`

Defined in: [types/mcp.ts:1271](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1271)

Custom name transformer

#### Parameters

##### name

`string`

#### Returns

`string`

---

### wrapWithContext?

> `optional` **wrapWithContext?**: `boolean`

Defined in: [types/mcp.ts:1276](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1276)

Add execution context wrapper

---

### executionTimeout?

> `optional` **executionTimeout?**: `number`

Defined in: [types/mcp.ts:1281](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1281)

Timeout for agent/workflow execution (ms)

---

### enableLogging?

> `optional` **enableLogging?**: `boolean`

Defined in: [types/mcp.ts:1286](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1286)

Enable execution logging
