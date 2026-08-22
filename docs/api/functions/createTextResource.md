[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTextResource

# Function: createTextResource()

> **createTextResource**(`uri`, `name`, `content`, `options?`): [`RegisteredResource`](../type-aliases/RegisteredResource.md)

Defined in: [mcp/serverCapabilities.ts:603](https://github.com/juspay/neurolink/blob/release/src/lib/mcp/serverCapabilities.ts#L603)

Create a simple text resource

## Parameters

### uri

`string`

### name

`string`

### content

`string` \| (() => `string` \| `Promise`\<`string`\>)

### options?

#### description?

`string`

#### dynamic?

`boolean`

## Returns

[`RegisteredResource`](../type-aliases/RegisteredResource.md)
