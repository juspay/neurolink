[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackResult

# Type Alias: CodexFallbackResult

> **CodexFallbackResult** = `object`

Defined in: [types/codex.ts:176](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L176)

Fully buffered Codex result rendered back as an Anthropic response.

## Properties

### text

> **text**: `string`

Defined in: [types/codex.ts:177](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L177)

---

### toolCalls

> **toolCalls**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"toolCalls"`\]\>

Defined in: [types/codex.ts:178](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L178)

---

### usage?

> `optional` **usage?**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"usage"`\]\>

Defined in: [types/codex.ts:179](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L179)

---

### finishReason

> **finishReason**: `"end_turn"` \| `"tool_use"`

Defined in: [types/codex.ts:180](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L180)
