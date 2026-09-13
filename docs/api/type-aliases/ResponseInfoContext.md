[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1854)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1855)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1856)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1857)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1859)

Names of the tools the model actually invoked (tool_use blocks).
