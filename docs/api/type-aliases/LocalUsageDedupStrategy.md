[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageDedupStrategy

# Type Alias: LocalUsageDedupStrategy

> **LocalUsageDedupStrategy** = `"message-id-keep-max"` \| `"last-write-wins"` \| `"rowid-high-water-mark"` \| `"session-dag"`

Defined in: [types/localUsage.ts:49](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L49)

How a reader avoids counting the same turn twice.

Metadata on the descriptor, for introspection and for the person writing the
next reader — the aggregator does not branch on it.
