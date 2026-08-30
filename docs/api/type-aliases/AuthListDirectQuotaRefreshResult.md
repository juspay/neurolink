[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListDirectQuotaRefreshResult

# Type Alias: AuthListDirectQuotaRefreshResult

> **AuthListDirectQuotaRefreshResult** = \{ `status`: `"refreshed"`; `quota`: [`AccountQuota`](AccountQuota.md); \} \| \{ `status`: `"unavailable"` \| `"not_supported"`; `error?`: `string`; \}

Defined in: [types/cli.ts:1131](https://github.com/juspay/neurolink/blob/release/src/lib/types/cli.ts#L1131)

One direct quota-adapter result used by `auth list --refresh`.
