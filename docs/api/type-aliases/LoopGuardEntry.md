[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LoopGuardEntry

# Type Alias: LoopGuardEntry

> **LoopGuardEntry** = `object`

Defined in: [types/context.ts:860](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L860)

Provider-neutral view of ONE message in an agent loop's history.

Every native provider loop keeps its history in a different shape (AI-SDK
`ModelMessage`, OpenAI-compatible `{role,tool_calls}`, Gemini `contents`
parts, Anthropic content blocks). The reclaim POLICY is identical across all
of them, so adapters map their own shape onto this view, ask the core what to
do, and apply the answer themselves.

## Properties

### kind

> **kind**: `"other"` \| `"toolCall"` \| `"toolResult"`

Defined in: [types/context.ts:862](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L862)

`toolCall` and `toolResult` form the batches the policy keeps intact.

---

### tokens

> **tokens**: `number`

Defined in: [types/context.ts:864](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L864)

Estimated tokens this entry currently costs.

---

### previewTokens?

> `optional` **previewTokens?**: `number`

Defined in: [types/context.ts:870](https://github.com/juspay/neurolink/blob/release/src/lib/types/context.ts#L870)

Tokens this entry would cost with its payload replaced by a head/tail
preview. Omitted when the entry cannot usefully shrink — which is exactly
the case that forces the policy to drop batches instead.
