[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerEvents

# Type Alias: MCPServerEvents

> **MCPServerEvents** = `object`

Defined in: [types/mcp.ts:1109](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1109)

Server lifecycle events.

## Properties

### toolRegistered

> **toolRegistered**: `object`

Defined in: [types/mcp.ts:1110](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1110)

#### toolName

> **toolName**: `string`

#### tool

> **tool**: [`MCPServerTool`](MCPServerTool.md)

---

### toolExecuted

> **toolExecuted**: `object`

Defined in: [types/mcp.ts:1111](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1111)

#### toolName

> **toolName**: `string`

#### duration

> **duration**: `number`

#### success

> **success**: `boolean`

---

### toolError

> **toolError**: `object`

Defined in: [types/mcp.ts:1112](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1112)

#### toolName

> **toolName**: `string`

#### error

> **error**: `Error`

---

### serverReady

> **serverReady**: `object`

Defined in: [types/mcp.ts:1113](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1113)

#### tools

> **tools**: `string`[]

---

### serverStopped

> **serverStopped**: `object`

Defined in: [types/mcp.ts:1114](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1114)

#### reason?

> `optional` **reason?**: `string`
