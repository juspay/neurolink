[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:4496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4496)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:4497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4497)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:4498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4498)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:4499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4499)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
