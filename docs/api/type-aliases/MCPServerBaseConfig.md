[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerBaseConfig

# Type Alias: MCPServerBaseConfig

> **MCPServerBaseConfig** = `object`

Base configuration for an MCP server.

## Properties

### id

> **id**: `string`

Unique server identifier

---

### name

> **name**: `string`

Human-readable server name

---

### description?

> `optional` **description?**: `string`

Server description

---

### version?

> `optional` **version?**: `string`

Server version

---

### category?

> `optional` **category?**: [`MCPServerCategory`](MCPServerCategory.md)

Server category for organization

---

### transport?

> `optional` **transport?**: [`MCPTransportType`](MCPTransportType.md)

Transport protocol preference

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, [`JsonValue`](JsonValue.md)\>

Custom metadata

---

### defaultTimeoutMs?

> `optional` **defaultTimeoutMs?**: `number`

Default timeout for tool execution in milliseconds (default: 30000)

---

### defaultAnnotations?

> `optional` **defaultAnnotations?**: [`MCPToolAnnotations`](MCPToolAnnotations.md)

Global tool annotations applied to all tools
