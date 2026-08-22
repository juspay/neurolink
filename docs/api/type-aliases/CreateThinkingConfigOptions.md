[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CreateThinkingConfigOptions

# Type Alias: CreateThinkingConfigOptions

> **CreateThinkingConfigOptions** = `object`

Defined in: [types/config.ts:589](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L589)

Options for creating a thinkingConfig from CLI-style options.

## Properties

### thinking?

> `optional` **thinking?**: `boolean`

Defined in: [types/config.ts:591](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L591)

Enable thinking mode

---

### thinkingBudget?

> `optional` **thinkingBudget?**: `number`

Defined in: [types/config.ts:593](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L593)

Token budget for thinking (defaults to 10000)

---

### thinkingLevel?

> `optional` **thinkingLevel?**: [`ThinkingLevel`](ThinkingLevel.md)

Defined in: [types/config.ts:595](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/config.ts#L595)

Thinking level for Gemini 3 models
