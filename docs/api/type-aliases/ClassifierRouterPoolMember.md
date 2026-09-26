[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterPoolMember

# Type Alias: ClassifierRouterPoolMember

> **ClassifierRouterPoolMember** = `object`

One candidate (provider, model, region) in the available base pool, with
optional routing metadata. When `cost`/`quality`/`capabilities` are omitted,
the router enriches them from the model registry (by `model` name/alias).

## Properties

### provider

> **provider**: `string`

---

### model?

> `optional` **model?**: `string`

---

### region?

> `optional` **region?**: `string`

---

### id?

> `optional` **id?**: `string`

Stable id the LLM classifier references when selecting a model directly.
Defaults to `${provider}/${model}` (or just `provider`) when omitted.

---

### description?

> `optional` **description?**: `string`

Plain-English description of when to use this model (e.g. "cheap & fast,
for simple Q&A" / "powerful reasoning model for complex analysis"). Drives
LLM-based model selection — the only metadata needed for custom models that
are NOT in the registry (LiteLLM, OpenAI-compatible, self-hosted, …).

---

### tiers?

> `optional` **tiers?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)[]

Difficulty tiers this member is eligible for. Omit = eligible for all.

---

### cost?

> `optional` **cost?**: `number`

Relative cost (lower = cheaper). Preferred for easy tiers.

---

### quality?

> `optional` **quality?**: `number`

Relative quality/capability (higher = more capable). Preferred for hard tiers.

---

### capabilities?

> `optional` **capabilities?**: `string`[]

Capability tags this member supports (e.g. "vision", "tools").

---

### weight?

> `optional` **weight?**: `number`

Tiebreak weight when scores are equal. Default: 1.
