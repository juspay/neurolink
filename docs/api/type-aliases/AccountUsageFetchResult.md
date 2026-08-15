[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountUsageFetchResult

# Type Alias: AccountUsageFetchResult

> **AccountUsageFetchResult** = \{ `ok`: `true`; `usage`: [`AnthropicUsageResponse`](AnthropicUsageResponse.md); \} \| \{ `ok`: `false`; `reason`: `"not_oauth"` \| `"auth"` \| `"http"` \| `"network"` \| `"parse"`; `error`: `string`; `status?`: `number`; \}

Defined in: [types/proxy.ts:1301](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/proxy.ts#L1301)

Outcome of one account's usage-endpoint fetch. Return-not-throw.
