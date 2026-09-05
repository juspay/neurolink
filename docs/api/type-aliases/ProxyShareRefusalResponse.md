[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareRefusalResponse

# Type Alias: ProxyShareRefusalResponse

> **ProxyShareRefusalResponse** = `object`

Defined in: [types/proxy.ts:3900](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3900)

A refusal rendered for the wire: status, headers and Anthropic-shaped body.

## Properties

### status

> **status**: `number`

Defined in: [types/proxy.ts:3901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3901)

---

### headers

> **headers**: `Record`\<`string`, `string`\>

Defined in: [types/proxy.ts:3902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3902)

---

### body

> **body**: `object`

Defined in: [types/proxy.ts:3903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3903)

#### type

> **type**: `"error"`

#### error

> **error**: `object`

##### error.type

> **type**: `string`

##### error.message

> **message**: `string`
