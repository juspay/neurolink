[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:4379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4379)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:4380](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4380)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:4381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4381)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:4382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4382)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
