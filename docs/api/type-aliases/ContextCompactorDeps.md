[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextCompactorDeps

# Type Alias: ContextCompactorDeps

> **ContextCompactorDeps** = `object`

Defined in: [types/context.ts:1085](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1085)

Injected dependencies for ContextCompactor.

Deliberately separate from `CompactionConfig`: that type is spread into a
`Required<CompactionConfig>` default, so a function member would need a
default implementation, and the compactor must stay fully usable with no
decision provider configured.

## Properties

### decide?

> `optional` **decide?**: [`DecisionCallerFn`](DecisionCallerFn.md)

Defined in: [types/context.ts:1087](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1087)

Fail-open decision caller. Omitted = the previous pipeline, exactly.

---

### relevance?

> `optional` **relevance?**: [`ContextRelevanceOptions`](ContextRelevanceOptions.md)

Defined in: [types/context.ts:1089](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1089)

Tuning for the relevance stage.

---

### summaryGate?

> `optional` **summaryGate?**: `object`

Defined in: [types/context.ts:1091](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L1091)

Tuning for the post-summarization quality gate.

#### timeoutMs?

> `optional` **timeoutMs?**: `number`

#### minConfidence?

> `optional` **minConfidence?**: `number`
