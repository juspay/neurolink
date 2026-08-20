[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicScopedExhaustion

# Type Alias: AnthropicScopedExhaustion

> **AnthropicScopedExhaustion** = `object`

Defined in: [types/proxy.ts:2869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2869)

Every account's model-scoped window for the requested model is spent. Unlike
a cooldown this is per-model: the same accounts stay healthy for every other
model, so the client is told to switch model rather than to back off.

## Properties

### model

> **model**: `string`

Defined in: [types/proxy.ts:2871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2871)

Wire model id from the request.

---

### scopeModel

> **scopeModel**: `string`

Defined in: [types/proxy.ts:2873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2873)

Display name of the exhausted window, e.g. "Fable".

---

### earliestResetMs

> **earliestResetMs**: `number`

Defined in: [types/proxy.ts:2875](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2875)

Epoch ms of the soonest reset across the exhausted accounts.

---

### accounts

> **accounts**: `string`[]

Defined in: [types/proxy.ts:2876](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2876)

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Defined in: [types/proxy.ts:2878](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2878)

Provider reason overage is unavailable, e.g. "org_level_disabled".
