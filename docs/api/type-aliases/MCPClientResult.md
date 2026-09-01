[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPClientResult

# Type Alias: MCPClientResult

> **MCPClientResult** = `object`

Defined in: [types/mcp.ts:804](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L804)

MCP client creation result
Moved from src/lib/mcp/mcpClientFactory.ts

## Properties

### success

> **success**: `boolean`

Defined in: [types/mcp.ts:806](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L806)

Whether client creation was successful

---

### client?

> `optional` **client?**: `Client`

Defined in: [types/mcp.ts:809](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L809)

Created client instance

---

### transport?

> `optional` **transport?**: `Transport`

Defined in: [types/mcp.ts:812](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L812)

Created transport instance

---

### process?

> `optional` **process?**: `ChildProcess`

Defined in: [types/mcp.ts:815](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L815)

Created process (for stdio transport)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:818](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L818)

Error message if failed

---

### duration

> **duration**: `number`

Defined in: [types/mcp.ts:821](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L821)

Creation duration in milliseconds

---

### capabilities?

> `optional` **capabilities?**: `ClientCapabilities`

Defined in: [types/mcp.ts:824](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L824)

Server capabilities reported during handshake
