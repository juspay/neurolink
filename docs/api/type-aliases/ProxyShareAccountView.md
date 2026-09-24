[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:4372](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4372)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4373](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4373)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4375](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4375)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4377](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4377)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4379](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4379)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4381](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4381)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:4383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4383)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:4385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4385)

Fraction (0..1) of the current 7d window this grant has already taken.
