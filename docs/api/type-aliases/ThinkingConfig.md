[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ThinkingConfig

# Type Alias: ThinkingConfig

> **ThinkingConfig** = `object`

Defined in: [types/config.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L608)

ThinkingConfig matching the SDK's expected structure.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/config.ts:609](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L609)

---

### type?

> `optional` **type?**: `"enabled"` \| `"disabled"`

Defined in: [types/config.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L610)

---

### budgetTokens?

> `optional` **budgetTokens?**: `number`

Defined in: [types/config.ts:612](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L612)

Token budget for thinking (Anthropic models: 5000-100000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:614](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L614)

Thinking level for Gemini 3 models
