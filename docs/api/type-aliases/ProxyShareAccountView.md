[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:3600](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3600)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3601](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3601)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3603](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3603)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3605](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3605)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3607](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3607)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3609](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3609)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:3611](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3611)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:3613](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3613)

Fraction (0..1) of the current 7d window this grant has already taken.
