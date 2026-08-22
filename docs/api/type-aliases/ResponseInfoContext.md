[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1648)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1649)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1650)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1651)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1653)

Names of the tools the model actually invoked (tool_use blocks).
