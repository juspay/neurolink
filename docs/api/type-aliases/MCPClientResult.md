[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPClientResult

# Type Alias: MCPClientResult

> **MCPClientResult** = `object`

Defined in: [types/mcp.ts:823](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L823)

MCP client creation result
Moved from src/lib/mcp/mcpClientFactory.ts

## Properties

### success

> **success**: `boolean`

Defined in: [types/mcp.ts:825](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L825)

Whether client creation was successful

---

### client?

> `optional` **client?**: `Client`

Defined in: [types/mcp.ts:828](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L828)

Created client instance

---

### transport?

> `optional` **transport?**: `Transport`

Defined in: [types/mcp.ts:831](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L831)

Created transport instance

---

### process?

> `optional` **process?**: `ChildProcess`

Defined in: [types/mcp.ts:834](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L834)

Created process (for stdio transport)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:837](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L837)

Error message if failed

---

### duration

> **duration**: `number`

Defined in: [types/mcp.ts:840](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L840)

Creation duration in milliseconds

---

### capabilities?

> `optional` **capabilities?**: `ClientCapabilities`

Defined in: [types/mcp.ts:843](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L843)

Server capabilities reported during handshake
