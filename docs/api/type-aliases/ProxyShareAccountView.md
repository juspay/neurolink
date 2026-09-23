[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:4247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4247)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4248)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4250](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4250)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4252](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4252)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4254](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4254)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4256](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4256)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:4258](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4258)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:4260](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4260)

Fraction (0..1) of the current 7d window this grant has already taken.
