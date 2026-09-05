[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1764)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1765](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1765)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1766](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1766)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1767](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1767)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1769](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1769)

Names of the tools the model actually invoked (tool_use blocks).
