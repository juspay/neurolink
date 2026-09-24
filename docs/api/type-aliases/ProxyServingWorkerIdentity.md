[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyServingWorkerIdentity

# Type Alias: ProxyServingWorkerIdentity

> **ProxyServingWorkerIdentity** = `object`

Defined in: [types/proxy.ts:3046](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3046)

Immutable identity of the worker an update attempt is allowed to replace.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:3047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3047)

---

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3048](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3048)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3050](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3050)

Rolling generation; null only for a legacy single-process service.
