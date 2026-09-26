[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextRelevanceOptions

# Type Alias: ContextRelevanceOptions

> **ContextRelevanceOptions** = `object`

Tuning for the relevance stage of context compaction.

## Properties

### protectRecent?

> `optional` **protectRecent?**: `number`

Trailing messages never eligible for dropping. Default 6.

---

### minDropConfidence?

> `optional` **minDropConfidence?**: `number`

Confidence required to drop a message. Default 0.6.

---

### maxDropRatio?

> `optional` **maxDropRatio?**: `number`

Ceiling on the share of eligible messages one pass may drop. Default 0.5.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Per-call timeout override for the decision request.
