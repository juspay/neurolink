[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4617)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4618)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4619)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4620)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4621)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4623)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4625)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4626](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4626)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4627)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4628](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4628)
