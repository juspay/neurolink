[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:2464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2464)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2465](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2465)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:2466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2466)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"`

Defined in: [types/proxy.ts:2467](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2467)
