[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageCliId

# Type Alias: LocalUsageCliId

> **LocalUsageCliId** = `"claude-code"` \| `"codex"` \| `"gemini-cli"` \| `"opencode"` \| `"qwen-code"` \| `"copilot-cli"` \| `"cursor"` \| `"amp"` \| `"hermes"` \| `"kiro"` \| `"antigravity"` \| `"grok"`

Defined in: [types/localUsage.ts:19](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L19)

Stable identifier for one CLI this subsystem can read local usage from.
Kebab-case, matching `CliProxyClientConfigurator.id`'s convention — a
different registry, but the same repo-wide convention for CLI identifiers.
