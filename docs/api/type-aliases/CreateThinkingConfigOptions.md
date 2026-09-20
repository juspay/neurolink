[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateThinkingConfigOptions

# Type Alias: CreateThinkingConfigOptions

> **CreateThinkingConfigOptions** = `object`

Defined in: [types/config.ts:618](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L618)

Options for creating a thinkingConfig from CLI-style options.

## Properties

### thinking?

> `optional` **thinking?**: `boolean`

Defined in: [types/config.ts:620](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L620)

Enable thinking mode

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/config.ts:622](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L622)

Token budget for thinking (defaults to 10000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:624](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L624)

Thinking level for Gemini 3 models
