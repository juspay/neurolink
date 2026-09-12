[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ThinkingConfig

# Type Alias: ThinkingConfig

> **ThinkingConfig** = `object`

Defined in: [types/config.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L596)

ThinkingConfig matching the SDK's expected structure.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/config.ts:597](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L597)

---

### type?

> `optional` **type?**: `"enabled"` \| `"disabled"`

Defined in: [types/config.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L598)

---

### budgetTokens?

> `optional` **budgetTokens?**: `number`

Defined in: [types/config.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L600)

Token budget for thinking (Anthropic models: 5000-100000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L602)

Thinking level for Gemini 3 models
