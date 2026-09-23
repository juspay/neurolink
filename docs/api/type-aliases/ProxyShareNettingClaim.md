[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNettingClaim

# Type Alias: ProxyShareNettingClaim

> **ProxyShareNettingClaim** = `object`

Defined in: [types/proxy.ts:4347](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4347)

One side's position in a reciprocal netting round.

## Properties

### consumedByYou

> **consumedByYou**: `number`

Defined in: [types/proxy.ts:4349](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4349)

Cumulative coins the _other_ node has consumed under my grant to them.

---

### alreadyNetted

> **alreadyNetted**: `number`

Defined in: [types/proxy.ts:4351](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4351)

Cumulative coins already forgiven on my side, so a replay nets nothing.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4352](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4352)
