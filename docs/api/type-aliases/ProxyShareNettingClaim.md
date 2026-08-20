[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNettingClaim

# Type Alias: ProxyShareNettingClaim

> **ProxyShareNettingClaim** = `object`

Defined in: [types/proxy.ts:3650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3650)

One side's position in a reciprocal netting round.

## Properties

### consumedByYou

> **consumedByYou**: `number`

Defined in: [types/proxy.ts:3652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3652)

Cumulative coins the _other_ node has consumed under my grant to them.

---

### alreadyNetted

> **alreadyNetted**: `number`

Defined in: [types/proxy.ts:3654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3654)

Cumulative coins already forgiven on my side, so a replay nets nothing.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3655)
