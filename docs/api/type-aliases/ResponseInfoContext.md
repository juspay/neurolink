[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1654)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1655)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1656)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1657)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1659)

Names of the tools the model actually invoked (tool_use blocks).
