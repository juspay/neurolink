[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:4631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4631)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:4632](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4632)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:4633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4633)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:4634](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4634)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
