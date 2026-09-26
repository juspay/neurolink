[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ThinkingConfig

# Type Alias: ThinkingConfig

> **ThinkingConfig** = `object`

Defined in: [types/config.ts:617](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L617)

ThinkingConfig matching the SDK's expected structure.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/config.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L618)

---

### type?

> `optional` **type?**: `"enabled"` \| `"disabled"`

Defined in: [types/config.ts:619](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L619)

---

### budgetTokens?

> `optional` **budgetTokens?**: `number`

Defined in: [types/config.ts:621](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L621)

Token budget for thinking (Anthropic models: 5000-100000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:623](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L623)

Thinking level for Gemini 3 models
