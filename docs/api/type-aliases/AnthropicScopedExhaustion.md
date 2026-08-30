[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicScopedExhaustion

# Type Alias: AnthropicScopedExhaustion

> **AnthropicScopedExhaustion** = `object`

Defined in: [types/proxy.ts:2936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2936)

Every account's model-scoped window for the requested model is spent. Unlike
a cooldown this is per-model: the same accounts stay healthy for every other
model, so the client is told to switch model rather than to back off.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:2938](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2938)

Wire model id from the request.

---

### scopeModel

> **scopeModel**: `string`

Defined in: [types/proxy.ts:2940](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2940)

Display name of the exhausted window, e.g. "Fable".

---

### earliestResetMs

> **earliestResetMs**: `number`

Defined in: [types/proxy.ts:2942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2942)

Epoch ms of the soonest reset across the exhausted accounts.

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:2943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2943)

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:2945](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2945)

Provider reason overage is unavailable, e.g. "org_level_disabled".
