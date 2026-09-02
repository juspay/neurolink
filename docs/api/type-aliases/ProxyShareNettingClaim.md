[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNettingClaim

# Type Alias: ProxyShareNettingClaim

> **ProxyShareNettingClaim** = `object`

Defined in: [types/proxy.ts:3742](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3742)

One side's position in a reciprocal netting round.

## Properties

### consumedByYou

> **consumedByYou**: `number`

Defined in: [types/proxy.ts:3744](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3744)

Cumulative coins the _other_ node has consumed under my grant to them.

---

### alreadyNetted

> **alreadyNetted**: `number`

Defined in: [types/proxy.ts:3746](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3746)

Cumulative coins already forgiven on my side, so a replay nets nothing.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3747](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3747)
