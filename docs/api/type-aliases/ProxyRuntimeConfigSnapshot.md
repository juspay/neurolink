[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeConfigSnapshot

# Type Alias: ProxyRuntimeConfigSnapshot

> **ProxyRuntimeConfigSnapshot** = [`ProxyRequestRoutingSnapshot`](ProxyRequestRoutingSnapshot.md) & `object`

Defined in: [types/proxy.ts:2911](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L2911)

Immutable last-known-good proxy configuration published at runtime.

## Type Declaration

### loadedAt

> **loadedAt**: `string`

### configHash

> **configHash**: `string`

### proxyConfig

> **proxyConfig**: [`LoadedProxyConfig`](LoadedProxyConfig.md) \| `null`
