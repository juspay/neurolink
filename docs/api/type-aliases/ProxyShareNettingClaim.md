[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNettingClaim

# Type Alias: ProxyShareNettingClaim

> **ProxyShareNettingClaim** = `object`

Defined in: [types/proxy.ts:3751](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3751)

One side's position in a reciprocal netting round.

## Properties

### consumedByYou

> **consumedByYou**: `number`

Defined in: [types/proxy.ts:3753](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3753)

Cumulative coins the _other_ node has consumed under my grant to them.

---

### alreadyNetted

> **alreadyNetted**: `number`

Defined in: [types/proxy.ts:3755](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3755)

Cumulative coins already forgiven on my side, so a replay nets nothing.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:3756](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3756)
