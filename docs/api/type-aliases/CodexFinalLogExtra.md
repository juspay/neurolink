[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFinalLogExtra

# Type Alias: CodexFinalLogExtra

> **CodexFinalLogExtra** = `Partial`\<`Pick`\<[`RequestLogEntry`](RequestLogEntry.md), `"errorType"` \| `"errorMessage"` \| `"errorCode"` \| `"transportScope"` \| `"inputTokens"` \| `"outputTokens"` \| `"cacheReadTokens"` \| `"cacheCreationTokens"` \| `"reasoningTokens"` \| `"terminalOutcome"` \| `"firstUsefulOutputMs"` \| `"firstUsefulOutputStatus"` \| `"firstUsefulOutputEvent"`\>\>

Defined in: [types/proxy.ts:976](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L976)

Additional fields recorded when a Codex response becomes client-final.
