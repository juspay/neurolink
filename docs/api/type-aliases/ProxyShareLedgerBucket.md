[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4256)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4257)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4258)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4259)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4260)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4262](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4262)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4264](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4264)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4265](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4265)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4266)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4267)
