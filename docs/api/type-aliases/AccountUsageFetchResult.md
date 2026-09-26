[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountUsageFetchResult

# Type Alias: AccountUsageFetchResult

> **AccountUsageFetchResult** = \{ `ok`: `true`; `usage`: [`AnthropicUsageResponse`](AnthropicUsageResponse.md); \} \| \{ `ok`: `false`; `reason`: `"not_oauth"` \| `"auth"` \| `"http"` \| `"network"` \| `"parse"`; `error`: `string`; `status?`: `number`; \}

Outcome of one account's usage-endpoint fetch. Return-not-throw.
