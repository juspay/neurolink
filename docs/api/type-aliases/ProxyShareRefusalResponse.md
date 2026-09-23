[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:4476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4476)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:4477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4477)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:4478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4478)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:4479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4479)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
