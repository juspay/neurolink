[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4667)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4668)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4669](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4669)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4670)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4671)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4673)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4675](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4675)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4676)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4677)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4678)
