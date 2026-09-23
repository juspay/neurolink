[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:4227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4227)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4228)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4230)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4232](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4232)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4234](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4234)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4236)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:4238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4238)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:4240](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4240)

Fraction (0..1) of the current 7d window this grant has already taken.
