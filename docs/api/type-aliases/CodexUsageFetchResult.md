[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexUsageFetchResult

# Type Alias: CodexUsageFetchResult

> **CodexUsageFetchResult** = \{ `ok`: `true`; `quota`: [`AccountQuota`](AccountQuota.md); \} \| \{ `ok`: `false`; `reason`: `"not_oauth"` \| `"auth"` \| `"http"` \| `"network"` \| `"parse"`; \}

Defined in: [types/codex.ts:82](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/codex.ts#L82)

Result of a single Codex usage fetch.
