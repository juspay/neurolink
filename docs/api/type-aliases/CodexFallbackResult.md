[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CodexFallbackResult

# Type Alias: CodexFallbackResult

> **CodexFallbackResult** = `object`

Fully buffered Codex result rendered back as an Anthropic response.

## Properties

### text

> **text**: `string`

---

### toolCalls

> **toolCalls**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"toolCalls"`\]\>

---

### usage?

> `optional` **usage?**: `NonNullable`\<[`InternalResult`](InternalResult.md)\[`"usage"`\]\> & `object`

#### Type Declaration

##### inputTokensObserved?

> `optional` **inputTokensObserved?**: `boolean`

Numeric serializer compatibility must not imply provider observation.

##### outputTokensObserved?

> `optional` **outputTokensObserved?**: `boolean`

##### cacheReadTokensObserved?

> `optional` **cacheReadTokensObserved?**: `boolean`

##### cacheCreationTokensObserved?

> `optional` **cacheCreationTokensObserved?**: `boolean`

---

### finishReason

> **finishReason**: `"end_turn"` \| `"tool_use"`
