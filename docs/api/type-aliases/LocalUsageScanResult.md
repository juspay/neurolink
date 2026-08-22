[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageScanResult

# Type Alias: LocalUsageScanResult

> **LocalUsageScanResult** = `object`

Defined in: [types/localUsage.ts:83](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L83)

What one reader's `scan()` returns.

## Properties

### cliId

> **cliId**: [`LocalUsageCliId`](LocalUsageCliId.md)

Defined in: [types/localUsage.ts:84](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L84)

---

### totals

> **totals**: [`LocalUsageTotals`](LocalUsageTotals.md)

Defined in: [types/localUsage.ts:85](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L85)

---

### filesScanned

> **filesScanned**: `number`

Defined in: [types/localUsage.ts:87](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L87)

Files opened during this scan, after any time filter.

---

### errors

> **errors**: [`LocalUsageScanError`](LocalUsageScanError.md)[]

Defined in: [types/localUsage.ts:88](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L88)
