[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliGrokProxyModelSpec

# Type Alias: CliGrokProxyModelSpec

> **CliGrokProxyModelSpec** = `object`

Defined in: [types/proxyClient.ts:111](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L111)

One Grok Build picker entry the proxy writer emits under `[model.<id>]`.

`contextWindow` is Grok's compaction limit and must be <= the upstream
model's window. `supportsReasoningEffort` is false when Grok's `xhigh`
would become Anthropic adaptive thinking that the model rejects.

## Properties

### id

> **id**: `string`

Defined in: [types/proxyClient.ts:112](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L112)

---

### name

> **name**: `string`

Defined in: [types/proxyClient.ts:113](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L113)

---

### apiBackend

> **apiBackend**: `"messages"` \| `"chat_completions"`

Defined in: [types/proxyClient.ts:114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L114)

---

### contextWindow

> **contextWindow**: `number`

Defined in: [types/proxyClient.ts:115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L115)

---

### maxCompletionTokens

> **maxCompletionTokens**: `number`

Defined in: [types/proxyClient.ts:116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L116)

---

### supportsReasoningEffort

> **supportsReasoningEffort**: `boolean`

Defined in: [types/proxyClient.ts:117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L117)
