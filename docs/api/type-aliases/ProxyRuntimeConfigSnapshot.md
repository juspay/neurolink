[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeConfigSnapshot

# Type Alias: ProxyRuntimeConfigSnapshot

> **ProxyRuntimeConfigSnapshot** = [`ProxyRequestRoutingSnapshot`](ProxyRequestRoutingSnapshot.md) & `object`

Defined in: [types/proxy.ts:3019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3019)

Immutable last-known-good proxy configuration published at runtime.

## Type Declaration

### loadedAt

> **loadedAt**: `string`

### configHash

> **configHash**: `string`

### proxyConfig

> **proxyConfig**: [`LoadedProxyConfig`](LoadedProxyConfig.md) \| `null`
