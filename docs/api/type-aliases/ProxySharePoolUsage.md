[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxySharePoolUsage

# Type Alias: ProxySharePoolUsage

> **ProxySharePoolUsage** = `object`

Defined in: [types/proxy.ts:4404](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4404)

A grant's consumption of the pool, normalised to one window's worth.

`Σ per-account fractions / accountCount`, so 0.2 means the borrower has taken
a fifth of total pool capacity however it was spread across credentials.

## Properties

### sessionFraction

> **sessionFraction**: `number`

Defined in: [types/proxy.ts:4405](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4405)

---

### weeklyFraction

> **weeklyFraction**: `number`

Defined in: [types/proxy.ts:4406](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4406)
