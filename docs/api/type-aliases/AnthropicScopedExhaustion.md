[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicScopedExhaustion

# Type Alias: AnthropicScopedExhaustion

> **AnthropicScopedExhaustion** = `object`

Defined in: [types/proxy.ts:3584](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3584)

Every account's model-scoped window for the requested model is spent. Unlike
a cooldown this is per-model: the same accounts stay healthy for every other
model, so the client is told to switch model rather than to back off.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3586](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3586)

Wire model id from the request.

---

### scopeModel

> **scopeModel**: `string`

Defined in: [types/proxy.ts:3588](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3588)

Display name of the exhausted window, e.g. "Fable".

---

### earliestResetMs

> **earliestResetMs**: `number`

Defined in: [types/proxy.ts:3590](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3590)

Epoch ms of the soonest reset across the exhausted accounts.

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:3591](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3591)

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:3593](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3593)

Provider reason overage is unavailable, e.g. "org_level_disabled".
