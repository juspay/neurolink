[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuotaSource

# Type Alias: AccountQuotaSource

> **AccountQuotaSource** = `"headers"` \| `"usage-api"`

Defined in: [types/proxy.ts:1230](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1230)

Where an AccountQuota snapshot came from.

- "headers" : passive capture of anthropic-ratelimit-unified-\* response
  headers on a routed request (the automatic path).
- "usage-api" : an explicit refresh against Anthropic's OAuth usage
  endpoint (manual refetch path).
