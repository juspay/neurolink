[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageReaderDescriptor

# Type Alias: LocalUsageReaderDescriptor

> **LocalUsageReaderDescriptor** = `object`

Defined in: [types/localUsage.ts:103](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L103)

Static metadata, available without constructing a reader.

## Properties

### id

> **id**: [`LocalUsageCliId`](LocalUsageCliId.md)

Defined in: [types/localUsage.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L104)

---

### displayName

> **displayName**: `string`

Defined in: [types/localUsage.ts:105](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L105)

---

### verified

> **verified**: `boolean`

Defined in: [types/localUsage.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L111)

True only for readers checked against real data on a real machine. An
honesty marker, not a completeness claim — an unverified reader may still
be correct, it just has not been shown to be.

---

### dedupStrategy

> **dedupStrategy**: [`LocalUsageDedupStrategy`](LocalUsageDedupStrategy.md)

Defined in: [types/localUsage.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L112)

---

### costConfidence

> **costConfidence**: [`LocalUsageCostConfidence`](LocalUsageCostConfidence.md)

Defined in: [types/localUsage.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L113)

---

### requiresSqlite

> **requiresSqlite**: `boolean`

Defined in: [types/localUsage.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L115)

Whether reading this CLI's store needs a SQLite binding.
