[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createJsonResource

# Function: createJsonResource()

> **createJsonResource**\<`T`\>(`uri`, `name`, `content`, `options?`): [`RegisteredResource`](../type-aliases/RegisteredResource.md)

Defined in: [mcp/serverCapabilities.ts:629](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L629)

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
