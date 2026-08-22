[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:2454](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2454)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2455](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2455)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:2456](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2456)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"`

Defined in: [types/proxy.ts:2457](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2457)
