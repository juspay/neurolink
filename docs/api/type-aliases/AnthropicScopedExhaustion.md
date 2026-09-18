[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicScopedExhaustion

# Type Alias: AnthropicScopedExhaustion

> **AnthropicScopedExhaustion** = `object`

Defined in: [types/proxy.ts:3334](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3334)

Every account's model-scoped window for the requested model is spent. Unlike
a cooldown this is per-model: the same accounts stay healthy for every other
model, so the client is told to switch model rather than to back off.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:3336](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3336)

Wire model id from the request.

---

### scopeModel

> **scopeModel**: `string`

Defined in: [types/proxy.ts:3338](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3338)

Display name of the exhausted window, e.g. "Fable".

---

### earliestResetMs

> **earliestResetMs**: `number`

Defined in: [types/proxy.ts:3340](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3340)

Epoch ms of the soonest reset across the exhausted accounts.

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:3341](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3341)

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:3343](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3343)

Provider reason overage is unavailable, e.g. "org_level_disabled".
