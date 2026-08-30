[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:3895](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3895)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3896](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3896)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3897](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3897)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3898](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3898)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3899](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3899)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:3901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3901)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:3903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3903)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:3904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3904)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:3905](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3905)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3906](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3906)
