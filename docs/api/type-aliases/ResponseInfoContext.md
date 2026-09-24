[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:2215](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2215)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:2216](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2216)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:2217](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2217)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:2218](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2218)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:2220](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2220)

Names of the tools the model actually invoked (tool_use blocks).
