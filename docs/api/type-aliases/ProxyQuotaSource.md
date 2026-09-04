[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaSource

# Type Alias: ProxyQuotaSource

> **ProxyQuotaSource** = `"live"` \| `"snapshot"` \| `"none"`

Defined in: [types/proxy.ts:1498](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1498)

Provenance of the quota numbers attached to a single proxy response.

- "live" : parsed from THIS upstream response's headers.
- "snapshot" : the last known snapshot for the serving account; the upstream
  response carried no quota headers.
- "none" : no Anthropic account served this request (fallback provider,
  or a failure before any account was reached).

Consumers must not treat "snapshot" as current. Without this distinction a
stale reading is indistinguishable from a fresh one.
