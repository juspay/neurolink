[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2136)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:2137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2137)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2138)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:2139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2139)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:2141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2141)

Names of the tools the model actually invoked (tool_use blocks).
