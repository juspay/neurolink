[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyServingWorkerIdentity

# Type Alias: ProxyServingWorkerIdentity

> **ProxyServingWorkerIdentity** = `object`

Defined in: [types/proxy.ts:3043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3043)

Immutable identity of the worker an update attempt is allowed to replace.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:3044](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3044)

---

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3045](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3045)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3047](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3047)

Rolling generation; null only for a legacy single-process service.
