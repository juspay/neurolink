[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareSpilloverGate

# Type Alias: ProxyShareSpilloverGate

> **ProxyShareSpilloverGate** = `object`

Defined in: [types/proxy.ts:3429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3429)

Use-it-or-lose-it capacity: admit the borrower only in the run-up to a window
reset, and only when little of that window was consumed. `maxSlicePct` caps
how much of the remaining window the borrower may take while spilling over,
so a spillover grant can still carry a hard ceiling.

## Properties

### beforeResetHours

> **beforeResetHours**: `number`

Defined in: [types/proxy.ts:3430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3430)

---

### whenUtilizationBelowPct

> **whenUtilizationBelowPct**: `number`

Defined in: [types/proxy.ts:3431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3431)

---

### maxSlicePct?

> `optional` **maxSlicePct?**: `number`

Defined in: [types/proxy.ts:3432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3432)
