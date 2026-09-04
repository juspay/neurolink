[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:2568](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2568)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2569](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2569)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:2570](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2570)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"`

Defined in: [types/proxy.ts:2571](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2571)
