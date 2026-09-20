[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierCandidate

# Type Alias: ClassifierCandidate

> **ClassifierCandidate** = `object`

Defined in: [types/classifierRouter.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L101)

Lightweight model descriptor handed to the LLM classifier so it can select a
model directly from the pool by `id` — the generic path for custom models.

## Properties

### id

> **id**: `string`

Defined in: [types/classifierRouter.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L102)

---

### provider

> **provider**: `string`

Defined in: [types/classifierRouter.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L103)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/classifierRouter.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L104)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/classifierRouter.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L105)

---

### tiers?

> `optional` **tiers?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)[]

Defined in: [types/classifierRouter.ts:106](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L106)

---

### capabilities?

> `optional` **capabilities?**: `string`[]

Defined in: [types/classifierRouter.ts:107](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L107)

---

### contextWindow?

> `optional` **contextWindow?**: `number`

Defined in: [types/classifierRouter.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L114)

Maximum input window, in tokens. Read from the model registry when the
pool is built from the catalogue. Nothing in routing consulted this
before — a request was routed to a model without ever asking whether it
could hold the request.

---

### inputCostPer1K?

> `optional` **inputCostPer1K?**: `number`

Defined in: [types/classifierRouter.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L116)

USD per 1K input tokens, for the cheapest-that-works judgement.

---

### outputCostPer1K?

> `optional` **outputCostPer1K?**: `number`

Defined in: [types/classifierRouter.ts:118](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L118)

USD per 1K output tokens.

---

### speed?

> `optional` **speed?**: `string`

Defined in: [types/classifierRouter.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L120)

Registry speed bucket ("fast" | "medium" | "slow").

---

### quality?

> `optional` **quality?**: `string`

Defined in: [types/classifierRouter.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L122)

Registry quality bucket ("high" | "medium" | "low").

---

### useCases?

> `optional` **useCases?**: `Readonly`\<`Record`\<`string`, `number`\>\>

Defined in: [types/classifierRouter.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L128)

The registry's per-dimension suitability scores (1–10): coding, analysis,
reasoning, conversation, creative, translation, summarization. Present
only for registry-backed models.

---

### score?

> `optional` **score?**: `number`

Defined in: [types/classifierRouter.ts:134](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L134)

Deterministic merit score for the difficulty this candidate was built
for, higher is better. Computed by `enrichCandidate`; it is what the
fallback ranker sorts on and is never sent to the model.

---

### relativeCost?

> `optional` **relativeCost?**: `number`

Defined in: [types/classifierRouter.ts:146](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L146)

The host's own `cost` / `quality` from the pool member, if it declared
them. These are RELATIVE scales, comparable only against other members
of the same pool — never a currency and never a registry bucket.

They are carried separately because they take precedence over anything
the registry says. A host that writes `quality: 2` next to "cheap and
fast; rote edits only" has made a statement about how it wants that
model used, and the registry — which may rate the same model highly on
its own general benchmarks — does not get to overrule it.

---

### relativeQuality?

> `optional` **relativeQuality?**: `number`

Defined in: [types/classifierRouter.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L147)
