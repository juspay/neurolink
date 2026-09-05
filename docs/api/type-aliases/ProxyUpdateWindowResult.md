[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:2574](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2574)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2575](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2575)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:2576](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2576)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"`

Defined in: [types/proxy.ts:2577](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2577)
