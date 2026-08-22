[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerEvents

# Type Alias: MCPServerEvents

> **MCPServerEvents** = `object`

Defined in: [types/mcp.ts:1090](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1090)

Server lifecycle events.

## Properties

### toolRegistered

> **toolRegistered**: `object`

Defined in: [types/mcp.ts:1091](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1091)

#### toolName

> **toolName**: `string`

#### tool

> **tool**: [`MCPServerTool`](MCPServerTool.md)

---

### toolExecuted

> **toolExecuted**: `object`

Defined in: [types/mcp.ts:1092](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1092)

#### toolName

> **toolName**: `string`

#### duration

> **duration**: `number`

#### success

> **success**: `boolean`

---

### toolError

> **toolError**: `object`

Defined in: [types/mcp.ts:1093](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1093)

#### toolName

> **toolName**: `string`

#### error

> **error**: `Error`

---

### serverReady

> **serverReady**: `object`

Defined in: [types/mcp.ts:1094](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1094)

#### tools

> **tools**: `string`[]

---

### serverStopped

> **serverStopped**: `object`

Defined in: [types/mcp.ts:1095](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/mcp.ts#L1095)

#### reason?

> `optional` **reason?**: `string`
