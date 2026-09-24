[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4545)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4546)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4547](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4547)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4548)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4549)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4551)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4553)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4554)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4555)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4556)
