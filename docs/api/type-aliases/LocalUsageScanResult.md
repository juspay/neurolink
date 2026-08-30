[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageScanResult

# Type Alias: LocalUsageScanResult

> **LocalUsageScanResult** = `object`

Defined in: [types/localUsage.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L158)

What one reader's `scan()` returns.

## Properties

### cliId

> **cliId**: [`LocalUsageCliId`](LocalUsageCliId.md)

Defined in: [types/localUsage.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L159)

---

### totals

> **totals**: [`LocalUsageTotals`](LocalUsageTotals.md)

Defined in: [types/localUsage.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L160)

---

### filesScanned

> **filesScanned**: `number`

Defined in: [types/localUsage.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L162)

Files opened during this scan, after any time filter.

---

### errors

> **errors**: [`LocalUsageScanError`](LocalUsageScanError.md)[]

Defined in: [types/localUsage.ts:163](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L163)
