[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:4621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4621)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:4622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4622)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:4623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4623)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:4624](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4624)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
