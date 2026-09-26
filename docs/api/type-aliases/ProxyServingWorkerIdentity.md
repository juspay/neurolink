[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyServingWorkerIdentity

# Type Alias: ProxyServingWorkerIdentity

> **ProxyServingWorkerIdentity** = `object`

Immutable identity of the worker an update attempt is allowed to replace.

## Properties

### version

> **version**: `string`

---

### pid

> **pid**: `number`

---

### generation

> **generation**: `number` \| `null`

Rolling generation; null only for a legacy single-process service.
