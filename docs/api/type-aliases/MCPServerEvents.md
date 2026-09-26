[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPServerEvents

# Type Alias: MCPServerEvents

> **MCPServerEvents** = `object`

Server lifecycle events.

## Properties

### toolRegistered

> **toolRegistered**: `object`

#### toolName

> **toolName**: `string`

#### tool

> **tool**: [`MCPServerTool`](MCPServerTool.md)

---

### toolExecuted

> **toolExecuted**: `object`

#### toolName

> **toolName**: `string`

#### duration

> **duration**: `number`

#### success

> **success**: `boolean`

---

### toolError

> **toolError**: `object`

#### toolName

> **toolName**: `string`

#### error

> **error**: `Error`

---

### serverReady

> **serverReady**: `object`

#### tools

> **tools**: `string`[]

---

### serverStopped

> **serverStopped**: `object`

#### reason?

> `optional` **reason?**: `string`
