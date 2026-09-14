[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:4210](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4210)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:4211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4211)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:4212](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4212)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:4213](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4213)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
