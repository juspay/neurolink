[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountQuotaSource

# Type Alias: AccountQuotaSource

> **AccountQuotaSource** = `"headers"` \| `"usage-api"`

Defined in: [types/proxy.ts:1248](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1248)

Where an AccountQuota snapshot came from.

- "headers" : passive capture of anthropic-ratelimit-unified-\* response
  headers on a routed request (the automatic path).
- "usage-api" : an explicit refresh against Anthropic's OAuth usage
  endpoint (manual refetch path).
