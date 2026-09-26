[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyServingWorkerIdentity

# Type Alias: ProxyServingWorkerIdentity

> **ProxyServingWorkerIdentity** = `object`

Defined in: [types/proxy.ts:3173](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3173)

Immutable identity of the worker an update attempt is allowed to replace.

## Properties

### version

> **version**: `string`

Defined in: [types/proxy.ts:3174](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3174)

---

### pid

> **pid**: `number`

Defined in: [types/proxy.ts:3175](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3175)

---

### generation

> **generation**: `number` \| `null`

Defined in: [types/proxy.ts:3177](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3177)

Rolling generation; null only for a legacy single-process service.
