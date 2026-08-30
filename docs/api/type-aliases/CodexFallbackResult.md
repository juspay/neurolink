[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackResult

# Type Alias: CodexFallbackResult

> **CodexFallbackResult** = `object`

Defined in: [types/codex.ts:158](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L158)

Fully buffered Codex result rendered back as an Anthropic response.

## Properties

### text

> **text**: `string`

Defined in: [types/codex.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L159)

---

### toolCalls

> **toolCalls**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"toolCalls"`\]\>

Defined in: [types/codex.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L160)

---

### usage?

> `optional` **usage?**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"usage"`\]\>

Defined in: [types/codex.ts:161](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L161)

---

### finishReason

> **finishReason**: `"end_turn"` \| `"tool_use"`

Defined in: [types/codex.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L162)
