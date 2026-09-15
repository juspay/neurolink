[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareLedgerBucket

# Type Alias: ProxyShareLedgerBucket

> **ProxyShareLedgerBucket** = `object`

Defined in: [types/proxy.ts:4270](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4270)

One grant's consumption of one account's current windows.

Keyed by the window's reset timestamp so a reset starts a fresh bucket
automatically — without that, a slice ceiling would latch permanently after
the first busy window.

## Properties

### grantId

> **grantId**: `string`

Defined in: [types/proxy.ts:4271](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4271)

---

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4272](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4272)

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4273](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4273)

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4274](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4274)

---

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4276](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4276)

Accumulated 5h-window utilization attributable to this grant (0..1).

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4278](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4278)

Accumulated 7d-window utilization attributable to this grant (0..1).

---

### coinsSpent

> **coinsSpent**: `number`

Defined in: [types/proxy.ts:4279](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4279)

---

### requests

> **requests**: `number`

Defined in: [types/proxy.ts:4280](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4280)

---

### updatedAt

> **updatedAt**: `number`

Defined in: [types/proxy.ts:4281](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4281)
