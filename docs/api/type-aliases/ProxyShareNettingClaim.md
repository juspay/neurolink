[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyShareNettingClaim

# Type Alias: ProxyShareNettingClaim

> **ProxyShareNettingClaim** = `object`

Defined in: [types/proxy.ts:4502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4502)

One side's position in a reciprocal netting round.

## Properties

### consumedByYou

> **consumedByYou**: `number`

Defined in: [types/proxy.ts:4504](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4504)

Cumulative coins the _other_ node has consumed under my grant to them.

---

### alreadyNetted

> **alreadyNetted**: `number`

Defined in: [types/proxy.ts:4506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4506)

Cumulative coins already forgiven on my side, so a replay nets nothing.

---

### signature

> **signature**: `string`

Defined in: [types/proxy.ts:4507](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L4507)
