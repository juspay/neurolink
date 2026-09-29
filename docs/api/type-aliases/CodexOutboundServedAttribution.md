[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexOutboundServedAttribution

# Type Alias: CodexOutboundServedAttribution

> **CodexOutboundServedAttribution** = `Required`\<`Pick`\<[`RequestLogEntry`](RequestLogEntry.md), `"account"` \| `"accountType"` \| `"provider"` \| `"model"`\>\> & `Pick`\<[`RequestLogEntry`](RequestLogEntry.md), `"accountKey"`\>

Who served a Codex turn the outbound fallback handed to a Claude target.
The outer Codex entry records it, as the OpenAI bridge's does, so the
final log names the served engine instead of the Codex pool.
