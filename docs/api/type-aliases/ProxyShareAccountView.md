[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:3651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3651)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3652)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3654)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3656)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3658](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3658)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3660)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:3662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3662)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:3664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3664)

Fraction (0..1) of the current 7d window this grant has already taken.
