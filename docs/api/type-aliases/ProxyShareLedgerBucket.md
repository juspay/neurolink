[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4145](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4145)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4146)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4147)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4148)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4149](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4149)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4151](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4151)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4153](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4153)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4154](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4154)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4155](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4155)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4156](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4156)
