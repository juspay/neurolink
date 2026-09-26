[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:3246](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3246)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:3247](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3247)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:3248](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3248)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"` \| `"busy"`

Defined in: [types/proxy.ts:3249](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3249)
