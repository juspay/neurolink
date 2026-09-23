[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareSpilloverGate

# Type Alias: ProxyShareSpilloverGate

> **ProxyShareSpilloverGate** = `object`

Defined in: [types/proxy.ts:4025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4025)

Use-it-or-lose-it capacity: admit the borrower only in the run-up to a window
reset, and only when little of that window was consumed. `maxSlicePct` caps
how much of the remaining window the borrower may take while spilling over,
so a spillover grant can still carry a hard ceiling.

## Properties

### beforeResetHours

> **beforeResetHours**: `number`

Defined in: [types/proxy.ts:4026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4026)

---

### whenUtilizationBelowPct

> **whenUtilizationBelowPct**: `number`

Defined in: [types/proxy.ts:4027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4027)

---

### maxSlicePct?

> `optional` **maxSlicePct?**: `number`

Defined in: [types/proxy.ts:4028](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4028)
