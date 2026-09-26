[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:2225](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2225)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:2226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2226)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:2227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2227)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:2228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2228)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:2230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2230)

Names of the tools the model actually invoked (tool_use blocks).
