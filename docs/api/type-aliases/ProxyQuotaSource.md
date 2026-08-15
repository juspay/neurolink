[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyQuotaSource

# Type Alias: ProxyQuotaSource

> **ProxyQuotaSource** = `"live"` \| `"snapshot"` \| `"none"`

Defined in: [types/proxy.ts:1376](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1376)

Provenance of the quota numbers attached to a single proxy response.

- "live" : parsed from THIS upstream response's headers.
- "snapshot" : the last known snapshot for the serving account; the upstream
  response carried no quota headers.
- "none" : no Anthropic account served this request (fallback provider,
  or a failure before any account was reached).

Consumers must not treat "snapshot" as current. Without this distinction a
stale reading is indistinguishable from a fresh one.
