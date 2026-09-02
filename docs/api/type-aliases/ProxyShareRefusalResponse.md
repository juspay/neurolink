[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:3871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3871)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:3872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3872)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:3873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3873)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:3874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3874)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
