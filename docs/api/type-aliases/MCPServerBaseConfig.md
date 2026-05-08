[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerBaseConfig

# Type Alias: MCPServerBaseConfig

> **MCPServerBaseConfig** = `object`

Defined in: [types/mcp.ts:1066](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1066)

Base configuration for an MCP server.

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1068](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1068)

Unique server identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1070](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1070)

Human-readable server name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1072](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1072)

Server description

---

### version?

> `optional` **version?**: `string`

Defined in: [types/mcp.ts:1074](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1074)

Server version

---

### category?

> `optional` **category?**: [`MCPServerCategory`](MCPServerCategory.md)

Defined in: [types/mcp.ts:1076](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1076)

Server category for organization

---

### transport?

> `optional` **transport?**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/mcp.ts:1078](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1078)

Transport protocol preference

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/mcp.ts:1080](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1080)

Custom metadata

---

### defaultTimeoutMs?

> `optional` **defaultTimeoutMs?**: `number`

Defined in: [types/mcp.ts:1082](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1082)

Default timeout for tool execution in milliseconds (default: 30000)

---

### defaultAnnotations?

> `optional` **defaultAnnotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/mcp.ts:1084](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L1084)

Global tool annotations applied to all tools
