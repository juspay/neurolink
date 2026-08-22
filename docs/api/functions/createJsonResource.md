[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createJsonResource

# Function: createJsonResource()

> **createJsonResource**\<`T`\>(`uri`, `name`, `content`, `options?`): [`RegisteredResource`](../type-aliases/RegisteredResource.md)

Defined in: [mcp/serverCapabilities.ts:629](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/mcp/serverCapabilities.ts#L629)

Create a JSON resource

## Type Parameters

### T

`T` _extends_ [`JsonObject`](../type-aliases/JsonObject.md)

## Parameters

### uri

`string`

### name

`string`

### content

`T` \| (() => `T` \| `Promise`\<`T`\>)

### options?

#### description?

`string`

#### dynamic?

`boolean`

## Returns

[`RegisteredResource`](../type-aliases/RegisteredResource.md)
