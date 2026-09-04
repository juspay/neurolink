[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNettingClaim

# Type Alias: ProxyShareNettingClaim

> **ProxyShareNettingClaim** = `object`

Defined in: [types/proxy.ts:3757](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3757)

One side's position in a reciprocal netting round.

## Properties

### consumedByYou

> **consumedByYou**: `number`

Defined in: [types/proxy.ts:3759](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3759)

Cumulative coins the _other_ node has consumed under my grant to them.

---

### alreadyNetted

> **alreadyNetted**: `number`

Defined in: [types/proxy.ts:3761](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3761)

Cumulative coins already forgiven on my side, so a replay nets nothing.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3762](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3762)
