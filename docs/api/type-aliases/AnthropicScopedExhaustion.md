[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicScopedExhaustion

# Type Alias: AnthropicScopedExhaustion

> **AnthropicScopedExhaustion** = `object`

Defined in: [types/proxy.ts:2958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2958)

Every account's model-scoped window for the requested model is spent. Unlike
a cooldown this is per-model: the same accounts stay healthy for every other
model, so the client is told to switch model rather than to back off.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:2960](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2960)

Wire model id from the request.

---

### scopeModel

> **scopeModel**: `string`

Defined in: [types/proxy.ts:2962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2962)

Display name of the exhausted window, e.g. "Fable".

---

### earliestResetMs

> **earliestResetMs**: `number`

Defined in: [types/proxy.ts:2964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2964)

Epoch ms of the soonest reset across the exhausted accounts.

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:2965](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2965)

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:2967](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2967)

Provider reason overage is unavailable, e.g. "org_level_disabled".
