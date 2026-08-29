[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageAggregateOptions

# Type Alias: LocalUsageAggregateOptions

> **LocalUsageAggregateOptions** = [`LocalUsageScanOptions`](LocalUsageScanOptions.md) & `object`

Defined in: [types/localUsage.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L299)

Options for scanning every registered reader at once.

`only` is not a convenience filter applied to the results — it decides which
readers are constructed and run at all. Scanning everything and discarding
the rest turned a 10s single-CLI query into 28s of reading two other stores
nobody asked for, one of them 742 MB.

## Type Declaration

### only?

> `optional` **only?**: [`LocalUsageCliId`](LocalUsageCliId.md)[]
