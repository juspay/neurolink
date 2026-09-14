[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:2862](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2862)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2863](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2863)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:2864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2864)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"`

Defined in: [types/proxy.ts:2865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2865)
