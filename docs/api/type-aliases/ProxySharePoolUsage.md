[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxySharePoolUsage

# Type Alias: ProxySharePoolUsage

> **ProxySharePoolUsage** = `object`

Defined in: [types/proxy.ts:3983](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3983)

A grant's consumption of the pool, normalised to one window's worth.

`Σ per-account fractions / accountCount`, so 0.2 means the borrower has taken
a fifth of total pool capacity however it was spread across credentials.

## Properties

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:3984](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3984)

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:3985](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3985)
