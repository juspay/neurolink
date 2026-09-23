[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4542](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4542)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4543)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4544](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4544)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4545](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4545)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4546](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4546)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4548](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4548)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4550)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4551)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4552)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4553)
