[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageReaderDescriptor

# Type Alias: LocalUsageReaderDescriptor

> **LocalUsageReaderDescriptor** = `object`

Static metadata, available without constructing a reader.

## Properties

### id

> **id**: [`LocalUsageCliId`](LocalUsageCliId.md)

---

### displayName

> **displayName**: `string`

---

### verified

> **verified**: `boolean`

True only for readers checked against real data on a real machine. An
honesty marker, not a completeness claim — an unverified reader may still
be correct, it just has not been shown to be.

---

### dedupStrategy

> **dedupStrategy**: [`LocalUsageDedupStrategy`](LocalUsageDedupStrategy.md)

---

### costConfidence

> **costConfidence**: [`LocalUsageCostConfidence`](LocalUsageCostConfidence.md)

---

### requiresSqlite

> **requiresSqlite**: `boolean`

Whether reading this CLI's store needs a SQLite binding.

---

### requestUnit?

> `optional` **requestUnit?**: [`LocalUsageRequestUnit`](LocalUsageRequestUnit.md)

What `LocalUsageTotals.requests` counts for this reader. Absent means
"turn", which is what every reader except Cursor records.
