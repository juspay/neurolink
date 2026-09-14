[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:3961](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3961)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:3962](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3962)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3964](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3964)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:3966](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3966)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3968](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3968)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:3970](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3970)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:3972](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3972)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:3974](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3974)

Fraction (0..1) of the current 7d window this grant has already taken.
