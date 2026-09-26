[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageScanOptions

# Type Alias: LocalUsageScanOptions

> **LocalUsageScanOptions** = `object`

Options accepted by every reader's `scan()` and by the aggregator.

## Properties

### sinceDays?

> `optional` **sinceDays?**: `number`

Only read files modified within this many days. Defaults to 30.

This is a real constraint rather than a convenience: one developer machine
held 17,439 transcripts totalling 9.7 GB, and an unbounded scan reads all
of it on every call. Pass `Infinity` for a deliberate full history sweep.
