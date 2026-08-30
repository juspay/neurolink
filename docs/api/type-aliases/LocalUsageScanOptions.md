[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageScanOptions

# Type Alias: LocalUsageScanOptions

> **LocalUsageScanOptions** = `object`

Defined in: [types/localUsage.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L188)

Options accepted by every reader's `scan()` and by the aggregator.

## Properties

### sinceDays?

> `optional` **sinceDays?**: `number`

Defined in: [types/localUsage.ts:196](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L196)

Only read files modified within this many days. Defaults to 30.

This is a real constraint rather than a convenience: one developer machine
held 17,439 transcripts totalling 9.7 GB, and an unbounded scan reads all
of it on every call. Pass `Infinity` for a deliberate full history sweep.
