[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolDedupConfig

# Type Alias: ToolDedupConfig

> **ToolDedupConfig** = `object`

Defined in: [types/toolDedup.ts:15](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolDedup.ts#L15)

Configuration for the opt-in tool-signature deduplication pass.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/toolDedup.ts:20](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolDedup.ts#L20)

Master switch. Dedup runs only when `true`.
Default: `false` (disabled — no change in behaviour).

---

### threshold?

> `optional` **threshold?**: `number`

Defined in: [types/toolDedup.ts:30](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/toolDedup.ts#L30)

Jaccard similarity threshold in [0, 1]. Pairs of tools whose token-set
Jaccard similarity over their canonical signatures meets or exceeds this
value are treated as near-duplicates; only one representative per cluster
(the first in stable input order) is forwarded to the model.

Default: `0.9`
