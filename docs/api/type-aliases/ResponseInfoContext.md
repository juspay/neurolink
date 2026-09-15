[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1960](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1960)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1961)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1962)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1963](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1963)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1965](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1965)

Names of the tools the model actually invoked (tool_use blocks).
