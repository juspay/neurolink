[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareAccountView

# Type Alias: ProxyShareAccountView

> **ProxyShareAccountView** = `object`

One candidate account as the share gates see it.

## Properties

### accountKey

> **accountKey**: `string`

---

### sessionUsed

> **sessionUsed**: `number` \| `null`

0..1 utilization of the 5h window, or null when unobserved.

---

### weeklyUsed

> **weeklyUsed**: `number` \| `null`

0..1 utilization of the 7d window, or null when unobserved.

---

### sessionResetAt

> **sessionResetAt**: `number` \| `null`

Epoch ms when the 5h window resets, or null when unknown.

---

### weeklyResetAt

> **weeklyResetAt**: `number` \| `null`

Epoch ms when the 7d window resets, or null when unknown.

---

### borrowedSessionFraction

> **borrowedSessionFraction**: `number`

Fraction (0..1) of the current 5h window this grant has already taken.

---

### borrowedWeeklyFraction

> **borrowedWeeklyFraction**: `number`

Fraction (0..1) of the current 7d window this grant has already taken.
