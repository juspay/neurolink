[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaSource

# Type Alias: ProxyQuotaSource

> **ProxyQuotaSource** = `"live"` \| `"snapshot"` \| `"none"`

Defined in: [types/proxy.ts:1394](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1394)

Provenance of the quota numbers attached to a single proxy response.

- "live" : parsed from THIS upstream response's headers.
- "snapshot" : the last known snapshot for the serving account; the upstream
  response carried no quota headers.
- "none" : no Anthropic account served this request (fallback provider,
  or a failure before any account was reached).

Consumers must not treat "snapshot" as current. Without this distinction a
stale reading is indistinguishable from a fresh one.
