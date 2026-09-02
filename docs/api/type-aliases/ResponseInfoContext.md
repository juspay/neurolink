[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1752](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1752)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1753)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1754](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1754)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1755)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1757)

Names of the tools the model actually invoked (tool_use blocks).
