[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4522](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4522)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4523](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4523)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4524](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4524)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4525](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4525)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4526](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4526)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4528](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4528)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4530)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4531)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4532)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4533)
