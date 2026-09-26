[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDedupConfig

# Type Alias: ToolDedupConfig

> **ToolDedupConfig** = `object`

Configuration for the opt-in tool-signature deduplication pass.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Master switch. Dedup runs only when `true`.
Default: `false` (disabled — no change in behaviour).

---

### threshold?

> `optional` **threshold?**: `number`

Jaccard similarity threshold in [0, 1]. Pairs of tools whose token-set
Jaccard similarity over their canonical signatures meets or exceeds this
value are treated as near-duplicates; only one representative per cluster
(the first in stable input order) is forwarded to the model.

Default: `0.9`
