[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ThinkingConfig

# Type Alias: ThinkingConfig

> **ThinkingConfig** = `object`

Defined in: [types/config.ts:586](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L586)

ThinkingConfig matching the SDK's expected structure.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/config.ts:587](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L587)

---

### type?

> `optional` **type?**: `"enabled"` \| `"disabled"`

Defined in: [types/config.ts:588](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L588)

---

### budgetTokens?

> `optional` **budgetTokens?**: `number`

Defined in: [types/config.ts:590](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L590)

Token budget for thinking (Anthropic models: 5000-100000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:592](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L592)

Thinking level for Gemini 3 models
