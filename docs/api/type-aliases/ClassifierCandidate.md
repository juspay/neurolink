[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierCandidate

# Type Alias: ClassifierCandidate

> **ClassifierCandidate** = `object`

Lightweight model descriptor handed to the LLM classifier so it can select a
model directly from the pool by `id` — the generic path for custom models.

## Properties

### id

> **id**: `string`

---

### provider

> **provider**: `string`

---

### model?

> `optional` **model?**: `string`

---

### description?

> `optional` **description?**: `string`

---

### tiers?

> `optional` **tiers?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)[]

---

### capabilities?

> `optional` **capabilities?**: `string`[]

---

### contextWindow?

> `optional` **contextWindow?**: `number`

Maximum input window, in tokens. Read from the model registry when the
pool is built from the catalogue. Nothing in routing consulted this
before — a request was routed to a model without ever asking whether it
could hold the request.

---

### inputCostPer1K?

> `optional` **inputCostPer1K?**: `number`

USD per 1K input tokens, for the cheapest-that-works judgement.

---

### outputCostPer1K?

> `optional` **outputCostPer1K?**: `number`

USD per 1K output tokens.

---

### speed?

> `optional` **speed?**: `string`

Registry speed bucket ("fast" | "medium" | "slow").

---

### quality?

> `optional` **quality?**: `string`

Registry quality bucket ("high" | "medium" | "low").

---

### useCases?

> `optional` **useCases?**: `Readonly`\<`Record`\<`string`, `number`\>\>

The registry's per-dimension suitability scores (1–10): coding, analysis,
reasoning, conversation, creative, translation, summarization. Present
only for registry-backed models.

---

### score?

> `optional` **score?**: `number`

Deterministic merit score for the difficulty this candidate was built
for, higher is better. Computed by `enrichCandidate`; it is what the
fallback ranker sorts on and is never sent to the model.

---

### relativeCost?

> `optional` **relativeCost?**: `number`

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
