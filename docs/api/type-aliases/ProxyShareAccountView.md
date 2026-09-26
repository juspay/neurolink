[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:4322](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4322)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4323](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4323)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4325](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4325)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4327](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4327)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4329](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4329)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4331](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4331)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:4333](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4333)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:4335](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4335)

Fraction (0..1) of the current 7d window this grant has already taken.
