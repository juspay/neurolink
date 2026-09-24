[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:4499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4499)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:4500](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4500)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:4501](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4501)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:4502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4502)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
