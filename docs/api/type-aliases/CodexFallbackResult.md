[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackResult

# Type Alias: CodexFallbackResult

> **CodexFallbackResult** = `object`

Defined in: [types/codex.ts:187](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L187)

Fully buffered Codex result rendered back as an Anthropic response.

## Properties

### text

> **text**: `string`

Defined in: [types/codex.ts:188](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L188)

---

### toolCalls

> **toolCalls**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"toolCalls"`\]\>

Defined in: [types/codex.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L189)

---

### usage?

> `optional` **usage?**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"usage"`\]\>

Defined in: [types/codex.ts:190](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L190)

---

### finishReason

> **finishReason**: `"end_turn"` \| `"tool_use"`

Defined in: [types/codex.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L191)
