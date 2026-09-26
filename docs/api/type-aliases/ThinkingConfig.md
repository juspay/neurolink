[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ThinkingConfig

# Type Alias: ThinkingConfig

> **ThinkingConfig** = `object`

ThinkingConfig matching the SDK's expected structure.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

---

### type?

> `optional` **type?**: `"enabled"` \| `"disabled"`

---

### budgetTokens?

> `optional` **budgetTokens?**: `number`

Token budget for thinking (Anthropic models: 5000-100000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Thinking level for Gemini 3 models
