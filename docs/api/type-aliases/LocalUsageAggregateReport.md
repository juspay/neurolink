[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageAggregateReport

# Type Alias: LocalUsageAggregateReport

> **LocalUsageAggregateReport** = `object`

Defined in: [types/localUsage.ts:149](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L149)

Top-level output of scanning every registered, detected reader.

## Properties

### generatedAt

> **generatedAt**: `string`

Defined in: [types/localUsage.ts:150](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L150)

---

### totals

> **totals**: `Partial`\<`Record`\<[`LocalUsageCliId`](LocalUsageCliId.md), [`LocalUsageTotals`](LocalUsageTotals.md)\>\>

Defined in: [types/localUsage.ts:152](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L152)

Only CLIs whose store was detected AND scanned appear here.

---

### failures

> **failures**: [`LocalUsageReaderFailure`](LocalUsageReaderFailure.md)[]

Defined in: [types/localUsage.ts:154](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L154)

CLIs whose reader could not be created, detected, or scanned, and why.

---

### notInstalled

> **notInstalled**: [`LocalUsageCliId`](LocalUsageCliId.md)[]

Defined in: [types/localUsage.ts:156](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L156)

CLIs with no local store on this machine — absent, not failed.
