[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicScopedExhaustion

# Type Alias: AnthropicScopedExhaustion

> **AnthropicScopedExhaustion** = `object`

Defined in: [types/proxy.ts:2973](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2973)

Every account's model-scoped window for the requested model is spent. Unlike
a cooldown this is per-model: the same accounts stay healthy for every other
model, so the client is told to switch model rather than to back off.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:2975](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2975)

Wire model id from the request.

---

### scopeModel

> **scopeModel**: `string`

Defined in: [types/proxy.ts:2977](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2977)

Display name of the exhausted window, e.g. "Fable".

---

### earliestResetMs

> **earliestResetMs**: `number`

Defined in: [types/proxy.ts:2979](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2979)

Epoch ms of the soonest reset across the exhausted accounts.

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:2980](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2980)

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:2982](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2982)

Provider reason overage is unavailable, e.g. "org_level_disabled".
