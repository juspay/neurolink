[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:4569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4569)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:4570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4570)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:4571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4571)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:4572](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4572)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
