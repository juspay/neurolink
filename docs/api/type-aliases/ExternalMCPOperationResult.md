[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPOperationResult

# Type Alias: ExternalMCPOperationResult\<T\>

> **ExternalMCPOperationResult**\<`T`\> = `object`

Defined in: [types/externalMcp.ts:236](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L236)

External MCP server operation result

## Type Parameters

### T

`T` = `unknown`

## Properties

### success

> **success**: `boolean`

Defined in: [types/externalMcp.ts:238](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L238)

Whether the operation was successful

---

### data?

> `optional` **data?**: `T`

Defined in: [types/externalMcp.ts:241](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L241)

Result data if successful

---

### error?

> `optional` **error?**: `string`

Defined in: [types/externalMcp.ts:244](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L244)

Error message if failed

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/externalMcp.ts:247](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L247)

Server ID

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/externalMcp.ts:250](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L250)

Operation duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/externalMcp.ts:253](https://github.com/juspay/neurolink/blob/release/src/lib/types/externalMcp.ts#L253)

Additional metadata

#### Index Signature

\[`key`: `string`\]: [`JsonValue`](JsonValue.md)

#### timestamp

> **timestamp**: `number`

#### operation

> **operation**: `string`
