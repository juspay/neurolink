[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1977)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1978](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1978)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1979)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1980)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1982](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1982)

Names of the tools the model actually invoked (tool_use blocks).
