[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageReaderDescriptor

# Type Alias: LocalUsageReaderDescriptor

> **LocalUsageReaderDescriptor** = `object`

Defined in: [types/localUsage.ts:92](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L92)

Static metadata, available without constructing a reader.

## Properties

### id

> **id**: [`LocalUsageCliId`](LocalUsageCliId.md)

Defined in: [types/localUsage.ts:93](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L93)

---

### displayName

> **displayName**: `string`

Defined in: [types/localUsage.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L94)

---

### verified

> **verified**: `boolean`

Defined in: [types/localUsage.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L100)

True only for readers checked against real data on a real machine. An
honesty marker, not a completeness claim — an unverified reader may still
be correct, it just has not been shown to be.

---

### dedupStrategy

> **dedupStrategy**: [`LocalUsageDedupStrategy`](LocalUsageDedupStrategy.md)

Defined in: [types/localUsage.ts:101](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L101)

---

### costConfidence

> **costConfidence**: [`LocalUsageCostConfidence`](LocalUsageCostConfidence.md)

Defined in: [types/localUsage.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L102)

---

### requiresSqlite

> **requiresSqlite**: `boolean`

Defined in: [types/localUsage.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L104)

Whether reading this CLI's store needs a SQLite binding.
