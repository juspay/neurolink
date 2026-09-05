[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:3933](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3933)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3934](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3934)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3935](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3935)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3936](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3936)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3937](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3937)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:3939](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3939)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:3941](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3941)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:3942](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3942)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:3943](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3943)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3944](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3944)
