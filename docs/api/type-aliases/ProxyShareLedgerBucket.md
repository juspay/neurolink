[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

---

### accountKey

> **accountKey**: `string`

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

---

### sessionFraction

> **sessionFraction**: `number`

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

---

### requests

> **requests**: `number`

---

### updatedAt

> **updatedAt**: `number`
