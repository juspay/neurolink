[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:2562](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2562)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2563](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2563)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:2564](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2564)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"`

Defined in: [types/proxy.ts:2565](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2565)
