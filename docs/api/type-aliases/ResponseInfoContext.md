[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:2203](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2203)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:2204](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2204)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:2205](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2205)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:2206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2206)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:2208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2208)

Names of the tools the model actually invoked (tool_use blocks).
