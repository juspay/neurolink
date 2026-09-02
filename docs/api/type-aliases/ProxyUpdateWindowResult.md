[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:2553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2553)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2554](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2554)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:2555](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2555)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"`

Defined in: [types/proxy.ts:2556](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2556)
