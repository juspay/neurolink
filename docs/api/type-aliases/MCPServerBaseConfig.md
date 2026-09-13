[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerBaseConfig

# Type Alias: MCPServerBaseConfig

> **MCPServerBaseConfig** = `object`

Defined in: [types/mcp.ts:1104](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1104)

Base configuration for an MCP server.

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1106](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1106)

Unique server identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1108](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1108)

Human-readable server name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1110)

Server description

---

### version?

> `optional` **version?**: `string`

Defined in: [types/mcp.ts:1112](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1112)

Server version

---

### category?

> `optional` **category?**: [`MCPServerCategory`](MCPServerCategory.md)

Defined in: [types/mcp.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1114)

Server category for organization

---

### transport?

> `optional` **transport?**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/mcp.ts:1116](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1116)

Transport protocol preference

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/mcp.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1118)

Custom metadata

---

### defaultTimeoutMs?

> `optional` **defaultTimeoutMs?**: `number`

Defined in: [types/mcp.ts:1120](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1120)

Default timeout for tool execution in milliseconds (default: 30000)

---

### defaultAnnotations?

> `optional` **defaultAnnotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/mcp.ts:1122](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1122)

Global tool annotations applied to all tools
