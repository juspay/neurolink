[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerEvents

# Type Alias: MCPServerEvents

> **MCPServerEvents** = `object`

Defined in: [types/mcp.ts:1128](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1128)

Server lifecycle events.

## Properties

### toolRegistered

> **toolRegistered**: `object`

Defined in: [types/mcp.ts:1129](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1129)

#### toolName

> **toolName**: `string`

#### tool

> **tool**: [`MCPServerTool`](MCPServerTool.md)

---

### toolExecuted

> **toolExecuted**: `object`

Defined in: [types/mcp.ts:1130](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1130)

#### toolName

> **toolName**: `string`

#### duration

> **duration**: `number`

#### success

> **success**: `boolean`

---

### toolError

> **toolError**: `object`

Defined in: [types/mcp.ts:1131](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1131)

#### toolName

> **toolName**: `string`

#### error

> **error**: `Error`

---

### serverReady

> **serverReady**: `object`

Defined in: [types/mcp.ts:1132](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1132)

#### tools

> **tools**: `string`[]

---

### serverStopped

> **serverStopped**: `object`

Defined in: [types/mcp.ts:1133](https://github.com/juspay/neurolink/blob/release/src/lib/types/mcp.ts#L1133)

#### reason?

> `optional` **reason?**: `string`
