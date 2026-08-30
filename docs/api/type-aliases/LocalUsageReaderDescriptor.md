[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageReaderDescriptor

# Type Alias: LocalUsageReaderDescriptor

> **LocalUsageReaderDescriptor** = `object`

Defined in: [types/localUsage.ts:167](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L167)

Static metadata, available without constructing a reader.

## Properties

### id

> **id**: [`LocalUsageCliId`](LocalUsageCliId.md)

Defined in: [types/localUsage.ts:168](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L168)

---

### displayName

> **displayName**: `string`

Defined in: [types/localUsage.ts:169](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L169)

---

### verified

> **verified**: `boolean`

Defined in: [types/localUsage.ts:175](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L175)

True only for readers checked against real data on a real machine. An
honesty marker, not a completeness claim — an unverified reader may still
be correct, it just has not been shown to be.

---

### dedupStrategy

> **dedupStrategy**: [`LocalUsageDedupStrategy`](LocalUsageDedupStrategy.md)

Defined in: [types/localUsage.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L176)

---

### costConfidence

> **costConfidence**: [`LocalUsageCostConfidence`](LocalUsageCostConfidence.md)

Defined in: [types/localUsage.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L177)

---

### requiresSqlite

> **requiresSqlite**: `boolean`

Defined in: [types/localUsage.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L179)

Whether reading this CLI's store needs a SQLite binding.

---

### requestUnit?

> `optional` **requestUnit?**: [`LocalUsageRequestUnit`](LocalUsageRequestUnit.md)

Defined in: [types/localUsage.ts:184](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L184)

What `LocalUsageTotals.requests` counts for this reader. Absent means
"turn", which is what every reader except Cursor records.
