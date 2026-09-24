[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyServingWorkerIdentity

# Type Alias: ProxyServingWorkerIdentity

> **ProxyServingWorkerIdentity** = `object`

Defined in: [types/proxy.ts:3163](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3163)

Immutable identity of the worker an update attempt is allowed to replace.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:3164](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3164)

---

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3165](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3165)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3167](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3167)

Rolling generation; null only for a legacy single-process service.
