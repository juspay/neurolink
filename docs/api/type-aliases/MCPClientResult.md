[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPClientResult

# Type Alias: MCPClientResult

> **MCPClientResult** = `object`

Defined in: [types/mcp.ts:785](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L785)

MCP client creation result
Moved from src/lib/mcp/mcpClientFactory.ts

## Properties

### success

> **success**: `boolean`

Defined in: [types/mcp.ts:787](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L787)

Whether client creation was successful

---

### client?

> `optional` **client?**: `Client`

Defined in: [types/mcp.ts:790](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L790)

Created client instance

---

### transport?

> `optional` **transport?**: `Transport`

Defined in: [types/mcp.ts:793](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L793)

Created transport instance

---

### process?

> `optional` **process?**: `ChildProcess`

Defined in: [types/mcp.ts:796](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L796)

Created process (for stdio transport)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/mcp.ts:799](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L799)

Error message if failed

---

### duration

> **duration**: `number`

Defined in: [types/mcp.ts:802](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L802)

Creation duration in milliseconds

---

### capabilities?

> `optional` **capabilities?**: `ClientCapabilities`

Defined in: [types/mcp.ts:805](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/mcp.ts#L805)

Server capabilities reported during handshake
