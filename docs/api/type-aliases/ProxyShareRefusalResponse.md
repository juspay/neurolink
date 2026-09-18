[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:4249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4249)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:4250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4250)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:4251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4251)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:4252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4252)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
