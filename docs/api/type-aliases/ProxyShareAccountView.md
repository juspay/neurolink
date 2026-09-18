[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

Defined in: [types/proxy.ts:4000](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4000)

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

Defined in: [types/proxy.ts:4001](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4001)

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4003)

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

Defined in: [types/proxy.ts:4005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4005)

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4007](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4007)

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Defined in: [types/proxy.ts:4009](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4009)

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Defined in: [types/proxy.ts:4011](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4011)

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Defined in: [types/proxy.ts:4013](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4013)

Fraction (0..1) of the current 7d window this grant has already taken.
