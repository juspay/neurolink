[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4425](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4425)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4426](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4426)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4427](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4427)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4428](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4428)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4429)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4431)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4433)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4434)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4435)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4436](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4436)
