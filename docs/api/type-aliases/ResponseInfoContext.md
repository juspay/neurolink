[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1743](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1743)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1744)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1745](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1745)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1746)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1748](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1748)

Names of the tools the model actually invoked (tool_use blocks).
