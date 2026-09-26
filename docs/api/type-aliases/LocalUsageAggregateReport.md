[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageAggregateReport

# Type Alias: LocalUsageAggregateReport

> **LocalUsageAggregateReport** = `object`

Top-level output of scanning every registered, detected reader.

## Properties

### generatedAt

> **generatedAt**: `string`

---

### totals

> **totals**: `Partial`\<`Record`\<[`LocalUsageCliId`](LocalUsageCliId.md), [`LocalUsageTotals`](LocalUsageTotals.md)\>\>

Only CLIs whose store was detected AND scanned appear here.

---

### failures

> **failures**: [`LocalUsageReaderFailure`](LocalUsageReaderFailure.md)[]

CLIs whose reader could not be created, detected, or scanned, and why.

---

### scanErrors

> **scanErrors**: [`LocalUsageScanError`](LocalUsageScanError.md)[]

Per-file problems from readers that otherwise succeeded.

Distinct from `failures`, which is a reader that threw. A scan can read
nine of ten transcripts and still be wrong by the tenth; without this the
shortfall is invisible and the totals look authoritative. Readers have
always collected these — nothing consumed them until now.

---

### notInstalled

> **notInstalled**: [`LocalUsageCliId`](LocalUsageCliId.md)[]

CLIs with no local store on this machine — absent, not failed.
