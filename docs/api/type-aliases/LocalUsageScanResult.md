[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageScanResult

# Type Alias: LocalUsageScanResult

> **LocalUsageScanResult** = `object`

Defined in: [types/localUsage.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L94)

What one reader's `scan()` returns.

## Properties

### cliId

> **cliId**: [`LocalUsageCliId`](LocalUsageCliId.md)

Defined in: [types/localUsage.ts:95](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L95)

---

### totals

> **totals**: [`LocalUsageTotals`](LocalUsageTotals.md)

Defined in: [types/localUsage.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L96)

---

### filesScanned

> **filesScanned**: `number`

Defined in: [types/localUsage.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L98)

Files opened during this scan, after any time filter.

---

### errors

> **errors**: [`LocalUsageScanError`](LocalUsageScanError.md)[]

Defined in: [types/localUsage.ts:99](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L99)
