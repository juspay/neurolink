[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyServingWorkerIdentity

# Type Alias: ProxyServingWorkerIdentity

> **ProxyServingWorkerIdentity** = `object`

Defined in: [types/proxy.ts:3111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3111)

Immutable identity of the worker an update attempt is allowed to replace.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:3112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3112)

---

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3113)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3115)

Rolling generation; null only for a legacy single-process service.
