[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:3236](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3236)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:3237](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3237)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:3238](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3238)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"` \| `"busy"`

Defined in: [types/proxy.ts:3239](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3239)
