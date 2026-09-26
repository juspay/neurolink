[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / createTextResource

# Function: createTextResource()

> **createTextResource**(`uri`, `name`, `content`, `options?`): [`RegisteredResource`](../type-aliases/RegisteredResource.md)

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
