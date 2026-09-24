[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierRouterPoolMember

# Type Alias: ClassifierRouterPoolMember

> **ClassifierRouterPoolMember** = `object`

Defined in: [types/classifierRouter.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L157)

One candidate (provider, model, region) in the available base pool, with
optional routing metadata. When `cost`/`quality`/`capabilities` are omitted,
the router enriches them from the model registry (by `model` name/alias).

## Properties

### provider

> **provider**: `string`

Defined in: [types/classifierRouter.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L158)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/classifierRouter.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L159)

---

### region?

> `optional` **region?**: `string`

Defined in: [types/classifierRouter.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L160)

---

### id?

> `optional` **id?**: `string`

Defined in: [types/classifierRouter.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L165)

Stable id the LLM classifier references when selecting a model directly.
Defaults to `${provider}/${model}` (or just `provider`) when omitted.

---

### description?

> `optional` **description?**: `string`

Defined in: [types/classifierRouter.ts:172](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L172)

Plain-English description of when to use this model (e.g. "cheap & fast,
for simple Q&A" / "powerful reasoning model for complex analysis"). Drives
LLM-based model selection — the only metadata needed for custom models that
are NOT in the registry (LiteLLM, OpenAI-compatible, self-hosted, …).

---

### tiers?

> `optional` **tiers?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)[]

Defined in: [types/classifierRouter.ts:174](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L174)

Difficulty tiers this member is eligible for. Omit = eligible for all.

---

### cost?

> `optional` **cost?**: `number`

Defined in: [types/classifierRouter.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L176)

Relative cost (lower = cheaper). Preferred for easy tiers.

---

### quality?

> `optional` **quality?**: `number`

Defined in: [types/classifierRouter.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L178)

Relative quality/capability (higher = more capable). Preferred for hard tiers.

---

### capabilities?

> `optional` **capabilities?**: `string`[]

Defined in: [types/classifierRouter.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L180)

Capability tags this member supports (e.g. "vision", "tools").

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/classifierRouter.ts:182](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L182)

Tiebreak weight when scores are equal. Default: 1.
