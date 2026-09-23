[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexAttemptLogExtra

# Type Alias: CodexAttemptLogExtra

> **CodexAttemptLogExtra** = `Partial`\<`Pick`\<[`RequestAttemptLogEntry`](RequestAttemptLogEntry.md), `"inputTokens"` \| `"outputTokens"` \| `"cacheReadTokens"` \| `"cacheCreationTokens"` \| `"reasoningTokens"` \| `"inputIncludesCachedTokens"` \| `"errorType"` \| `"errorMessage"` \| `"errorCode"` \| `"transportScope"` \| `"retryable"` \| `"rateLimitKind"` \| `"cooldownReason"` \| `"quotaResetAt"` \| `"quotaScope"`\>\>

Defined in: [types/proxy.ts:1118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1118)

Additional fields recorded for each upstream Codex account attempt.
