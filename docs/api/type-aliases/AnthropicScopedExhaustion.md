[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicScopedExhaustion

# Type Alias: AnthropicScopedExhaustion

> **AnthropicScopedExhaustion** = `object`

Defined in: [types/proxy.ts:3295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3295)

Every account's model-scoped window for the requested model is spent. Unlike
a cooldown this is per-model: the same accounts stay healthy for every other
model, so the client is told to switch model rather than to back off.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3297)

Wire model id from the request.

---

### scopeModel

> **scopeModel**: `string`

Defined in: [types/proxy.ts:3299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3299)

Display name of the exhausted window, e.g. "Fable".

---

### earliestResetMs

> **earliestResetMs**: `number`

Defined in: [types/proxy.ts:3301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3301)

Epoch ms of the soonest reset across the exhausted accounts.

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:3302](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3302)

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:3304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3304)

Provider reason overage is unavailable, e.g. "org_level_disabled".
