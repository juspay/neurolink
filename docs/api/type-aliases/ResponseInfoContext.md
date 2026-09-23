[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:2133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2133)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:2134](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2134)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:2135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2135)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:2136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2136)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:2138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2138)

Names of the tools the model actually invoked (tool_use blocks).
