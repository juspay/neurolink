[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:3779](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3779)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:3780](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3780)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:3781](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3781)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:3782](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3782)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
