[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateThinkingConfigOptions

# Type Alias: CreateThinkingConfigOptions

> **CreateThinkingConfigOptions** = `object`

Defined in: [types/config.ts:596](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L596)

Options for creating a thinkingConfig from CLI-style options.

## Properties

### thinking?

> `optional` **thinking?**: `boolean`

Defined in: [types/config.ts:598](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L598)

Enable thinking mode

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/config.ts:600](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L600)

Token budget for thinking (defaults to 10000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:602](https://github.com/juspay/neurolink/blob/release/src/lib/types/config.ts#L602)

Thinking level for Gemini 3 models
