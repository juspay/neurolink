[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:3917](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3917)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3918](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3918)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3919](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3919)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3920](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3920)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3921](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3921)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:3923](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3923)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:3925](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3925)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:3926](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3926)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:3927](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3927)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3928](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3928)
