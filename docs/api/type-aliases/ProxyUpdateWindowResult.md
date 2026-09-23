[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:3096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3096)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:3097](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3097)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:3098](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3098)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"` \| `"busy"`

Defined in: [types/proxy.ts:3099](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3099)
