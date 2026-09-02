[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateThinkingConfigOptions

# Type Alias: CreateThinkingConfigOptions

> **CreateThinkingConfigOptions** = `object`

Defined in: [types/config.ts:599](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L599)

Options for creating a thinkingConfig from CLI-style options.

## Properties

### thinking?

> `optional` **thinking?**: `boolean`

Defined in: [types/config.ts:601](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L601)

Enable thinking mode

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/config.ts:603](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L603)

Token budget for thinking (defaults to 10000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:605](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L605)

Thinking level for Gemini 3 models
