[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPOperationResult

# Type Alias: ExternalMCPOperationResult\<T\>

> **ExternalMCPOperationResult**\<`T`\> = `object`

Defined in: [types/externalMcp.ts:240](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L240)

External MCP server operation result

## Type Parameters

### T

`T` = `unknown`

## Properties

### success

> **success**: `boolean`

Defined in: [types/externalMcp.ts:242](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L242)

Whether the operation was successful

---

### data?

> `optional` **data?**: `T`

Defined in: [types/externalMcp.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L245)

Result data if successful

---

### error?

> `optional` **error?**: `string`

Defined in: [types/externalMcp.ts:248](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L248)

Error message if failed

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/externalMcp.ts:251](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L251)

Server ID

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/externalMcp.ts:254](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L254)

Operation duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object` & `object`

Defined in: [types/externalMcp.ts:266](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L266)

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
