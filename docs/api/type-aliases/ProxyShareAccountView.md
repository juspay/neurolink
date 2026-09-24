[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:4250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4250)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4251](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4251)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4253](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4253)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4255](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4255)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4257](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4257)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4259](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4259)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:4261](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4261)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:4263](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4263)

Fraction (0..1) of the current 7d window this grant has already taken.
