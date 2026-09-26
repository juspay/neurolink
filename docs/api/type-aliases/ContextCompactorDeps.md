[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ContextCompactorDeps

# Type Alias: ContextCompactorDeps

> **ContextCompactorDeps** = `object`

Injected dependencies for ContextCompactor.

Deliberately separate from `CompactionConfig`: that type is spread into a
`Required<CompactionConfig>` default, so a function member would need a
default implementation, and the compactor must stay fully usable with no
decision provider configured.

## Properties

### decide?

> `optional` **decide?**: [`DecisionCallerFn`](DecisionCallerFn.md)

Fail-open decision caller. Omitted = the previous pipeline, exactly.

---

### relevance?

> `optional` **relevance?**: [`ContextRelevanceOptions`](ContextRelevanceOptions.md)

Tuning for the relevance stage.

---

### summaryGate?

> `optional` **summaryGate?**: `object`

Tuning for the post-summarization quality gate.

#### timeoutMs?

> `optional` **timeoutMs?**: `number`

#### minConfidence?

> `optional` **minConfidence?**: `number`
