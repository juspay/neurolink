[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:2062](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2062)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:2063](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2063)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:2064](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2064)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:2065](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2065)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:2067](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2067)

Names of the tools the model actually invoked (tool_use blocks).
