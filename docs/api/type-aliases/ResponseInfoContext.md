[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseInfoContext

# Type Alias: ResponseInfoContext

> **ResponseInfoContext** = `object`

Defined in: [types/proxy.ts:1759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1759)

Response-side details parsed from the upstream reply (model, finish, tools).

## Properties

### responseModel?

> `optional` **responseModel?**: `string`

Defined in: [types/proxy.ts:1760](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1760)

---

### finishReason?

> `optional` **finishReason?**: `string`

Defined in: [types/proxy.ts:1761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1761)

---

### stopSequence?

> `optional` **stopSequence?**: `string`

Defined in: [types/proxy.ts:1762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1762)

---

### toolCalls?

> `optional` **toolCalls?**: `string`[]

Defined in: [types/proxy.ts:1764](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1764)

Names of the tools the model actually invoked (tool_use blocks).
