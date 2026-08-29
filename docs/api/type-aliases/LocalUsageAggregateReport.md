[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageAggregateReport

# Type Alias: LocalUsageAggregateReport

> **LocalUsageAggregateReport** = `object`

Defined in: [types/localUsage.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L160)

Top-level output of scanning every registered, detected reader.

## Properties

### generatedAt

> **generatedAt**: `string`

Defined in: [types/localUsage.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L161)

---

### totals

> **totals**: `Partial`\<`Record`\<[`LocalUsageCliId`](LocalUsageCliId.md), [`LocalUsageTotals`](LocalUsageTotals.md)\>\>

Defined in: [types/localUsage.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L163)

Only CLIs whose store was detected AND scanned appear here.

---

### failures

> **failures**: [`LocalUsageReaderFailure`](LocalUsageReaderFailure.md)[]

Defined in: [types/localUsage.ts:165](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L165)

CLIs whose reader could not be created, detected, or scanned, and why.

---

### scanErrors

> **scanErrors**: [`LocalUsageScanError`](LocalUsageScanError.md)[]

Defined in: [types/localUsage.ts:174](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L174)

Per-file problems from readers that otherwise succeeded.

Distinct from `failures`, which is a reader that threw. A scan can read
nine of ten transcripts and still be wrong by the tenth; without this the
shortfall is invisible and the totals look authoritative. Readers have
always collected these — nothing consumed them until now.

---

### notInstalled

> **notInstalled**: [`LocalUsageCliId`](LocalUsageCliId.md)[]

Defined in: [types/localUsage.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L176)

CLIs with no local store on this machine — absent, not failed.
