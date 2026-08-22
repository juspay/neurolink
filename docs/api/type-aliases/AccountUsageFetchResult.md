[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AccountUsageFetchResult

# Type Alias: AccountUsageFetchResult

> **AccountUsageFetchResult** = \{ `ok`: `true`; `usage`: [`AnthropicUsageResponse`](AnthropicUsageResponse.md); \} \| \{ `ok`: `false`; `reason`: `"not_oauth"` \| `"auth"` \| `"http"` \| `"network"` \| `"parse"`; `error`: `string`; `status?`: `number`; \}

Defined in: [types/proxy.ts:1319](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/proxy.ts#L1319)

Outcome of one account's usage-endpoint fetch. Return-not-throw.
