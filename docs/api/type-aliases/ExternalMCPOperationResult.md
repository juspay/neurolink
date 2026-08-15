[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ExternalMCPOperationResult

# Type Alias: ExternalMCPOperationResult\<T\>

> **ExternalMCPOperationResult**\<`T`\> = `object`

Defined in: [types/externalMcp.ts:230](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L230)

External MCP server operation result

## Type Parameters

### T

`T` = `unknown`

## Properties

### success

> **success**: `boolean`

Defined in: [types/externalMcp.ts:232](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L232)

Whether the operation was successful

---

### data?

> `optional` **data?**: `T`

Defined in: [types/externalMcp.ts:235](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L235)

Result data if successful

---

### error?

> `optional` **error?**: `string`

Defined in: [types/externalMcp.ts:238](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L238)

Error message if failed

---

### serverId?

> `optional` **serverId?**: `string`

Defined in: [types/externalMcp.ts:241](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L241)

Server ID

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/externalMcp.ts:244](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L244)

Operation duration in milliseconds

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/externalMcp.ts:247](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/externalMcp.ts#L247)

Additional metadata

#### Index Signature

\[`key`: `string`\]: [`JsonValue`](JsonValue.md)

#### timestamp

> **timestamp**: `number`

#### operation

> **operation**: `string`
