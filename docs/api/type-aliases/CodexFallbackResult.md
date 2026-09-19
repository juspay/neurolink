[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackResult

# Type Alias: CodexFallbackResult

> **CodexFallbackResult** = `object`

Defined in: [types/codex.ts:198](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L198)

Fully buffered Codex result rendered back as an Anthropic response.

## Properties

### text

> **text**: `string`

Defined in: [types/codex.ts:199](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L199)

---

### toolCalls

> **toolCalls**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"toolCalls"`\]\>

Defined in: [types/codex.ts:200](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L200)

---

### usage?

> `optional` **usage?**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"usage"`\]\> & `object`

Defined in: [types/codex.ts:201](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L201)

#### Type Declaration

##### inputTokensObserved?

> `optional` **inputTokensObserved?**: `boolean`

Numeric serializer compatibility must not imply provider observation.

##### outputTokensObserved?

> `optional` **outputTokensObserved?**: `boolean`

---

### finishReason

> **finishReason**: `"end_turn"` \| `"tool_use"`

Defined in: [types/codex.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/codex.ts#L206)
