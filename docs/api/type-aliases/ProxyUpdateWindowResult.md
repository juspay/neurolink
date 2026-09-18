[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:2901](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2901)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2902](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2902)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:2903](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2903)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"`

Defined in: [types/proxy.ts:2904](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2904)
