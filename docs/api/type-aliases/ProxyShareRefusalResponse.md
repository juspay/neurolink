[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:3849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3849)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:3850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3850)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:3851](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3851)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:3852](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3852)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
