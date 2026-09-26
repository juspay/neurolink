[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthListDirectQuotaRefreshResult

# Type Alias: AuthListDirectQuotaRefreshResult

> **AuthListDirectQuotaRefreshResult** = \{ `status`: `"refreshed"`; `quota`: [`AccountQuota`](AccountQuota.md); \} \| \{ `status`: `"unavailable"` \| `"not_supported"`; `error?`: `string`; \}

One direct quota-adapter result used by `auth list --refresh`.
