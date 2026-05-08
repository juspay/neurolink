[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExposureOptions

# Type Alias: ExposureOptions

> **ExposureOptions** = `object`

Defined in: [types/mcp.ts:1214](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1214)

Options for exposing agents/workflows as MCP tools

## Properties

### prefix?

> `optional` **prefix?**: `string`

Defined in: [types/mcp.ts:1218](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1218)

Prefix for tool names

---

### defaultAnnotations?

> `optional` **defaultAnnotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/mcp.ts:1223](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1223)

Default annotations for all exposed tools

---

### includeMetadataInDescription?

> `optional` **includeMetadataInDescription?**: `boolean`

Defined in: [types/mcp.ts:1228](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1228)

Whether to include metadata in tool description

---

### nameTransformer?

> `optional` **nameTransformer?**: (`name`) => `string`

Defined in: [types/mcp.ts:1233](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1233)

Custom name transformer

#### Parameters

##### name

`string`

#### Returns

`string`

---

### wrapWithContext?

> `optional` **wrapWithContext?**: `boolean`

Defined in: [types/mcp.ts:1238](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1238)

Add execution context wrapper

---

### executionTimeout?

> `optional` **executionTimeout?**: `number`

Defined in: [types/mcp.ts:1243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1243)

Timeout for agent/workflow execution (ms)

---

### enableLogging?

> `optional` **enableLogging?**: `boolean`

Defined in: [types/mcp.ts:1248](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1248)

Enable execution logging
