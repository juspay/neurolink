[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4295)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4296)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4297](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4297)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4298)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4299](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4299)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4301](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4301)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4303](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4303)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4304](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4304)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4305](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4305)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4306](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4306)
