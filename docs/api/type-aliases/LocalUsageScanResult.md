[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageScanResult

# Type Alias: LocalUsageScanResult

> **LocalUsageScanResult** = `object`

What one reader's `scan()` returns.

## Properties

### cliId

> **cliId**: [`LocalUsageCliId`](LocalUsageCliId.md)

---

### totals

> **totals**: [`LocalUsageTotals`](LocalUsageTotals.md)

---

### filesScanned

> **filesScanned**: `number`

Files opened during this scan, after any time filter.

---

### errors

> **errors**: [`LocalUsageScanError`](LocalUsageScanError.md)[]
