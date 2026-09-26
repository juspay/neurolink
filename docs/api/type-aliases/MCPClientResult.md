[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPClientResult

# Type Alias: MCPClientResult

> **MCPClientResult** = `object`

MCP client creation result
Moved from src/lib/mcp/mcpClientFactory.ts

## Properties

### success

> **success**: `boolean`

Whether client creation was successful

---

### client?

> `optional` **client?**: `Client`

Created client instance

---

### transport?

> `optional` **transport?**: `Transport`

Created transport instance

---

### process?

> `optional` **process?**: `ChildProcess`

Created process (for stdio transport)

---

### error?

> `optional` **error?**: `string`

Error message if failed

---

### duration

> **duration**: `number`

Creation duration in milliseconds

---

### capabilities?

> `optional` **capabilities?**: `ClientCapabilities`

Server capabilities reported during handshake
