[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4677)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4678](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4678)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4679](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4679)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4680](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4680)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4681](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4681)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4683](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4683)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4685](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4685)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4686](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4686)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4687](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4687)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4688](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4688)
