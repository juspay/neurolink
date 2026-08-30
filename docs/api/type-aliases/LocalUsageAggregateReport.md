[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageAggregateReport

# Type Alias: LocalUsageAggregateReport

> **LocalUsageAggregateReport** = `object`

Defined in: [types/localUsage.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L229)

Top-level output of scanning every registered, detected reader.

## Properties

### generatedAt

> **generatedAt**: `string`

Defined in: [types/localUsage.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L230)

---

### totals

> **totals**: `Partial`\<`Record`\<[`LocalUsageCliId`](LocalUsageCliId.md), [`LocalUsageTotals`](LocalUsageTotals.md)\>\>

Defined in: [types/localUsage.ts:232](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L232)

Only CLIs whose store was detected AND scanned appear here.

---

### failures

> **failures**: [`LocalUsageReaderFailure`](LocalUsageReaderFailure.md)[]

Defined in: [types/localUsage.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L234)

CLIs whose reader could not be created, detected, or scanned, and why.

---

### scanErrors

> **scanErrors**: [`LocalUsageScanError`](LocalUsageScanError.md)[]

Defined in: [types/localUsage.ts:243](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L243)

Per-file problems from readers that otherwise succeeded.

Distinct from `failures`, which is a reader that threw. A scan can read
nine of ten transcripts and still be wrong by the tenth; without this the
shortfall is invisible and the totals look authoritative. Readers have
always collected these — nothing consumed them until now.

---

### notInstalled

> **notInstalled**: [`LocalUsageCliId`](LocalUsageCliId.md)[]

Defined in: [types/localUsage.ts:245](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L245)

CLIs with no local store on this machine — absent, not failed.
