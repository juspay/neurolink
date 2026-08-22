[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ClassifierCandidate

# Type Alias: ClassifierCandidate

> **ClassifierCandidate** = `object`

Defined in: [types/classifierRouter.ts:56](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L56)

Lightweight model descriptor handed to the LLM classifier so it can select a
model directly from the pool by `id` — the generic path for custom models.

## Properties

### id

> **id**: `string`

Defined in: [types/classifierRouter.ts:57](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L57)

---

### provider

> **provider**: `string`

Defined in: [types/classifierRouter.ts:58](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L58)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/classifierRouter.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L59)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/classifierRouter.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L60)

---

### tiers?

> `optional` **tiers?**: [`ClassifierDifficulty`](ClassifierDifficulty.md)[]

Defined in: [types/classifierRouter.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L61)

---

### capabilities?

> `optional` **capabilities?**: `string`[]

Defined in: [types/classifierRouter.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/classifierRouter.ts#L62)
