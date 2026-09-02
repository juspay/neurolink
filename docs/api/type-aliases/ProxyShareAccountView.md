[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:3622](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3622)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3623](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3623)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3625](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3625)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3627](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3627)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3629](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3629)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3631](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3631)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:3633](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3633)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:3635](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3635)

Fraction (0..1) of the current 7d window this grant has already taken.
