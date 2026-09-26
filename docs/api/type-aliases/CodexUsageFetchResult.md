[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexUsageFetchResult

# Type Alias: CodexUsageFetchResult

> **CodexUsageFetchResult** = \{ `ok`: `true`; `quota`: [`AccountQuota`](AccountQuota.md); \} \| \{ `ok`: `false`; `reason`: `"not_oauth"` \| `"auth"` \| `"rate_limited"` \| `"http"` \| `"network"` \| `"parse"`; \}

Result of a single Codex usage fetch.
