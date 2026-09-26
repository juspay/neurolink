[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateThinkingConfigOptions

# Type Alias: CreateThinkingConfigOptions

> **CreateThinkingConfigOptions** = `object`

Defined in: [types/config.ts:627](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L627)

Options for creating a thinkingConfig from CLI-style options.

## Properties

### thinking?

> `optional` **thinking?**: `boolean`

Defined in: [types/config.ts:629](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L629)

Enable thinking mode

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/config.ts:631](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L631)

Token budget for thinking (defaults to 10000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:633](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L633)

Thinking level for Gemini 3 models
