[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPOperationResult

# Type Alias: ExternalMCPOperationResult\<T\>

> **ExternalMCPOperationResult**\<`T`\> = `object`

External MCP server operation result

## Type Parameters

### T

`T` = `unknown`

## Properties

### success

> **success**: `boolean`

Whether the operation was successful

---

### data?

> `optional` **data?**: `T`

Result data if successful

---

### error?

> `optional` **error?**: `string`

Error message if failed

---

### serverId?

> `optional` **serverId?**: `string`

Server ID

---

### duration?

> `optional` **duration?**: `number`

Operation duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object` & `object`

Additional metadata.

The two typed optional fields are intersected with the pre-existing
`JsonValue` index signature rather than declared inside it: declaring an
optional property next to a `JsonValue` index signature does not compile
(its type includes `undefined`), and widening the index signature to
`JsonValue | undefined` would change the read type of every other key
for every existing consumer — a backward-incompatible public change.

#### Type Declaration

##### timestamp

> **timestamp**: `number`

##### operation

> **operation**: `string`

##### readiness?

> `optional` **readiness?**: [`MCPServerReadiness`](MCPServerReadiness.md)

Set on `addServer` results: whether the registration discovered
enough tools to be considered ready (see `MCPServerInfo.minTools`).
Absent on operations the minTools gate does not apply to.

##### toolsDiscovered?

> `optional` **toolsDiscovered?**: `number`

Set alongside `readiness` on `addServer` results — tools discovered, post block-list.
