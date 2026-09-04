[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:3637](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3637)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3638)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3640)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3642)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3644](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3644)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3646](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3646)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:3648](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3648)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:3650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3650)

Fraction (0..1) of the current 7d window this grant has already taken.
