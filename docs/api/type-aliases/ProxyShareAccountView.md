[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:3530](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3530)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3531)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3533)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3535](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3535)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3537](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3537)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3539](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3539)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:3541](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3541)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:3543](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3543)

Fraction (0..1) of the current 7d window this grant has already taken.
