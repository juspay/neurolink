[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ThinkingConfig

# Type Alias: ThinkingConfig

> **ThinkingConfig** = `object`

Defined in: [types/config.ts:589](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L589)

ThinkingConfig matching the SDK's expected structure.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/config.ts:590](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L590)

---

### type?

> `optional` **type?**: `"enabled"` \| `"disabled"`

Defined in: [types/config.ts:591](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L591)

---

### budgetTokens?

> `optional` **budgetTokens?**: `number`

Defined in: [types/config.ts:593](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L593)

Token budget for thinking (Anthropic models: 5000-100000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:595](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L595)

Thinking level for Gemini 3 models
