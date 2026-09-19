[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:4130](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4130)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4131](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4131)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4133](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4133)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4135)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4137)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4139](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4139)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:4141](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4141)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:4143](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4143)

Fraction (0..1) of the current 7d window this grant has already taken.
