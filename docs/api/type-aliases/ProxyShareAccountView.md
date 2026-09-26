[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:4382](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4382)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4383](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4383)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4385](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4385)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4387](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4387)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4389](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4389)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4391](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4391)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:4393](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4393)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:4395](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4395)

Fraction (0..1) of the current 7d window this grant has already taken.
