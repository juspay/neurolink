[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterPoolMember

# Type Alias: ClassifierRouterPoolMember

> **ClassifierRouterPoolMember** = `object`

Defined in: [types/classifierRouter.ts:70](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L70)

One candidate (provider, model, region) in the available base pool, with
optional routing metadata. When `cost`/`quality`/`capabilities` are omitted,
the router enriches them from the model registry (by `model` name/alias).

## Properties

### provider

> **provider**: `string`

Defined in: [types/classifierRouter.ts:71](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L71)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/classifierRouter.ts:72](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L72)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/classifierRouter.ts:73](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L73)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/classifierRouter.ts:78](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L78)

Stable id the LLM classifier references when selecting a model directly.
Defaults to `${provider}/${model}` (or just `provider`) when omitted.

---

### description?

> `optional` **description?**: `string`

Defined in: [types/classifierRouter.ts:85](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L85)

Plain-English description of when to use this model (e.g. "cheap & fast,
for simple Q&A" / "powerful reasoning model for complex analysis"). Drives
LLM-based model selection — the only metadata needed for custom models that
are NOT in the registry (LiteLLM, OpenAI-compatible, self-hosted, …).

---

### tiers?

> `optional` **tiers?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)[]

Defined in: [types/classifierRouter.ts:87](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L87)

Difficulty tiers this member is eligible for. Omit = eligible for all.

---

### cost?

> `optional` **cost?**: `number`

Defined in: [types/classifierRouter.ts:89](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L89)

Relative cost (lower = cheaper). Preferred for easy tiers.

---

### quality?

> `optional` **quality?**: `number`

Defined in: [types/classifierRouter.ts:91](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L91)

Relative quality/capability (higher = more capable). Preferred for hard tiers.

---

### capabilities?

> `optional` **capabilities?**: `string`[]

Defined in: [types/classifierRouter.ts:93](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L93)

Capability tags this member supports (e.g. "vision", "tools").

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/classifierRouter.ts:95](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/classifierRouter.ts#L95)

Tiebreak weight when scores are equal. Default: 1.
