[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyRuntimeConfigSnapshot

# Type Alias: ProxyRuntimeConfigSnapshot

> **ProxyRuntimeConfigSnapshot** = [`ProxyRequestRoutingSnapshot`](ProxyRequestRoutingSnapshot.md) & `object`

Defined in: [types/proxy.ts:2832](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L2832)

Immutable last-known-good proxy configuration published at runtime.

## Type Declaration

### loadedAt

> **loadedAt**: `string`

### configHash

> **configHash**: `string`

### proxyConfig

> **proxyConfig**: [`LoadedProxyConfig`](LoadedProxyConfig.md) \| `null`
