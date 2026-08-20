[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:3825](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3825)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3826](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3826)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3827](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3827)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3828](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3828)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3829](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3829)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:3831](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3831)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:3833](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3833)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:3834](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3834)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:3835](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3835)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3836](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3836)
