[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:3946](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3946)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:3947](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3947)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3948](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3948)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3949](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3949)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3950](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3950)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:3952](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3952)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:3954](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3954)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:3955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3955)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:3956](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3956)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:3957](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3957)
