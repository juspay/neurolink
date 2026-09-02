[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerBaseConfig

# Type Alias: MCPServerBaseConfig

> **MCPServerBaseConfig** = `object`

Defined in: [types/mcp.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1085)

Base configuration for an MCP server.

## Properties

### id

> **id**: `string`

Defined in: [types/mcp.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1087)

Unique server identifier

---

### name

> **name**: `string`

Defined in: [types/mcp.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1089)

Human-readable server name

---

### description?

> `optional` **description?**: `string`

Defined in: [types/mcp.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1091)

Server description

---

### version?

> `optional` **version?**: `string`

Defined in: [types/mcp.ts:1093](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1093)

Server version

---

### category?

> `optional` **category?**: [`MCPServerCategory`](MCPServerCategory.md)

Defined in: [types/mcp.ts:1095](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1095)

Server category for organization

---

### transport?

> `optional` **transport?**: [`MCPTransportType`](MCPTransportType.md)

Defined in: [types/mcp.ts:1097](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1097)

Transport protocol preference

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Defined in: [types/mcp.ts:1099](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1099)

Custom metadata

---

### defaultTimeoutMs?

> `optional` **defaultTimeoutMs?**: `number`

Defined in: [types/mcp.ts:1101](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1101)

Default timeout for tool execution in milliseconds (default: 30000)

---

### defaultAnnotations?

> `optional` **defaultAnnotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Defined in: [types/mcp.ts:1103](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1103)

Global tool annotations applied to all tools
