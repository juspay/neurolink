[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:3638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3638)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3639)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3641)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3643](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3643)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3645](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3645)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3647](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3647)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:3649](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3649)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:3651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3651)

Fraction (0..1) of the current 7d window this grant has already taken.
