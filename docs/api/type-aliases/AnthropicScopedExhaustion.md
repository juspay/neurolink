[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicScopedExhaustion

# Type Alias: AnthropicScopedExhaustion

> **AnthropicScopedExhaustion** = `object`

Defined in: [types/proxy.ts:2987](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2987)

Every account's model-scoped window for the requested model is spent. Unlike
a cooldown this is per-model: the same accounts stay healthy for every other
model, so the client is told to switch model rather than to back off.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:2989](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2989)

Wire model id from the request.

---

### scopeModel

> **scopeModel**: `string`

Defined in: [types/proxy.ts:2991](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2991)

Display name of the exhausted window, e.g. "Fable".

---

### earliestResetMs

> **earliestResetMs**: `number`

Defined in: [types/proxy.ts:2993](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2993)

Epoch ms of the soonest reset across the exhausted accounts.

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:2994](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2994)

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:2996](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2996)

Provider reason overage is unavailable, e.g. "org_level_disabled".
