[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1721)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1722](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1722)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1723](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1723)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1724)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1726](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1726)

Names of the tools the model actually invoked (tool_use blocks).
