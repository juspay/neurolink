[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:3184](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3184)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:3185](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3185)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:3186](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3186)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"` \| `"busy"`

Defined in: [types/proxy.ts:3187](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3187)
