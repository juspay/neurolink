[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexUsageFetchResult

# Type Alias: CodexUsageFetchResult

> **CodexUsageFetchResult** = \{ `ok`: `true`; `quota`: [`AccountQuota`](AccountQuota.md); \} \| \{ `ok`: `false`; `reason`: `"not_oauth"` \| `"auth"` \| `"http"` \| `"network"` \| `"parse"`; \}

Defined in: [types/codex.ts:82](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/codex.ts#L82)

Result of a single Codex usage fetch.
