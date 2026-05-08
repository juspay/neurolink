[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ThinkingConfig

# Type Alias: ThinkingConfig

> **ThinkingConfig** = `object`

Defined in: [types/config.ts:453](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L453)

ThinkingConfig matching the SDK's expected structure.

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/config.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L454)

---

### type?

> `optional` **type?**: `"enabled"` \| `"disabled"`

Defined in: [types/config.ts:455](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L455)

---

### budgetTokens?

> `optional` **budgetTokens?**: `number`

Defined in: [types/config.ts:457](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L457)

Token budget for thinking (Anthropic models: 5000-100000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:459](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/config.ts#L459)

Thinking level for Gemini 3 models
