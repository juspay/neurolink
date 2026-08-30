[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyUpdateWindowResult

# Type Alias: ProxyUpdateWindowResult

> **ProxyUpdateWindowResult** = `object`

Defined in: [types/proxy.ts:2531](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2531)

Result from waiting for a non-disruptive updater execution window.

## Properties

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2532](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2532)

---

### draining

> **draining**: `boolean`

Defined in: [types/proxy.ts:2533](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2533)

---

### reason?

> `optional` **reason?**: `"stopping"` \| `"parent_stopped"` \| `"drain_failed"` \| `"drain_timeout"`

Defined in: [types/proxy.ts:2534](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2534)
