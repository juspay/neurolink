[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextRelevanceOptions

# Type Alias: ContextRelevanceOptions

> **ContextRelevanceOptions** = `object`

Defined in: [types/context.ts:1050](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1050)

Tuning for the relevance stage of context compaction.

## Properties

### protectRecent?

> `optional` **protectRecent?**: `number`

Defined in: [types/context.ts:1052](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1052)

Trailing messages never eligible for dropping. Default 6.

---

### minDropConfidence?

> `optional` **minDropConfidence?**: `number`

Defined in: [types/context.ts:1054](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1054)

Confidence required to drop a message. Default 0.6.

---

### maxDropRatio?

> `optional` **maxDropRatio?**: `number`

Defined in: [types/context.ts:1056](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1056)

Ceiling on the share of eligible messages one pass may drop. Default 0.5.

---

### timeoutMs?

> `optional` **timeoutMs?**: `number`

Defined in: [types/context.ts:1058](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1058)

Per-call timeout override for the decision request.
