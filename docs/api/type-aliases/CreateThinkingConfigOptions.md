[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateThinkingConfigOptions

# Type Alias: CreateThinkingConfigOptions

> **CreateThinkingConfigOptions** = `object`

Defined in: [types/config.ts:606](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L606)

Options for creating a thinkingConfig from CLI-style options.

## Properties

### thinking?

> `optional` **thinking?**: `boolean`

Defined in: [types/config.ts:608](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L608)

Enable thinking mode

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/config.ts:610](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L610)

Token budget for thinking (defaults to 10000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:612](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L612)

Thinking level for Gemini 3 models
