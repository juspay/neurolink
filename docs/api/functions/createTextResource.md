[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTextResource

# Function: createTextResource()

> **createTextResource**(`uri`, `name`, `content`, `options?`): [`RegisteredResource`](../type-aliases/RegisteredResource.md)

Defined in: [mcp/serverCapabilities.ts:603](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/mcp/serverCapabilities.ts#L603)

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
