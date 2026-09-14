[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1953)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1954)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1955)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1956)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1958)

Names of the tools the model actually invoked (tool_use blocks).
