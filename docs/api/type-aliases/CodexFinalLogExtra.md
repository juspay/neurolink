[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFinalLogExtra

# Type Alias: CodexFinalLogExtra

> **CodexFinalLogExtra** = `Partial`\<`Pick`\<[`RequestLogEntry`](RequestLogEntry.md), `"errorType"` \| `"errorMessage"` \| `"errorCode"` \| `"transportScope"` \| `"inputTokens"` \| `"outputTokens"` \| `"cacheReadTokens"` \| `"cacheCreationTokens"` \| `"terminalOutcome"` \| `"firstUsefulOutputMs"` \| `"firstUsefulOutputStatus"` \| `"firstUsefulOutputEvent"`\>\>

Defined in: [types/proxy.ts:958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L958)

Additional fields recorded when a Codex response becomes client-final.
