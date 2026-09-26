[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliGrokProxyModelSpec

# Type Alias: CliGrokProxyModelSpec

> **CliGrokProxyModelSpec** = `object`

One Grok Build picker entry the proxy writer emits under `[model.<id>]`.

`contextWindow` is Grok's compaction limit and must be <= the upstream
model's window. `supportsReasoningEffort` is false when Grok's `xhigh`
would become Anthropic adaptive thinking that the model rejects.

## Properties

### id

> **id**: `string`

---

### name

> **name**: `string`

---

### apiBackend

> **apiBackend**: `"messages"` \| `"chat_completions"`

---

### contextWindow

> **contextWindow**: `number`

---

### maxCompletionTokens

> **maxCompletionTokens**: `number`

---

### supportsReasoningEffort

> **supportsReasoningEffort**: `boolean`
