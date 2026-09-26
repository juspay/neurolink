[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicScopedExhaustion

# Type Alias: AnthropicScopedExhaustion

> **AnthropicScopedExhaustion** = `object`

Every account's model-scoped window for the requested model is spent. Unlike
a cooldown this is per-model: the same accounts stay healthy for every other
model, so the client is told to switch model rather than to back off.

## Properties

### model

> **model**: `string`

Wire model id from the request.

---

### scopeModel

> **scopeModel**: `string`

Display name of the exhausted window, e.g. "Fable".

---

### earliestResetMs

> **earliestResetMs**: `number`

Epoch ms of the soonest reset across the exhausted accounts.

---

### accounts

> **accounts**: `string`[]

---

### overageDisabledReason?

> `optional` **overageDisabledReason?**: `string`

Provider reason overage is unavailable, e.g. "org_level_disabled".
