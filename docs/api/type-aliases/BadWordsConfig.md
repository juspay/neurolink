[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / BadWordsConfig

# Type Alias: BadWordsConfig

> **BadWordsConfig** = `object`

Defined in: [types/guardrails.ts:88](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/guardrails.ts#L88)

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/guardrails.ts:89](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/guardrails.ts#L89)

---

### list?

> `optional` **list?**: `string`[]

Defined in: [types/guardrails.ts:90](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/guardrails.ts#L90)

---

### regexPatterns?

> `optional` **regexPatterns?**: `string`[]

Defined in: [types/guardrails.ts:91](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/guardrails.ts#L91)

---

### replacementText?

> `optional` **replacementText?**: `string`

Defined in: [types/guardrails.ts:102](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/guardrails.ts#L102)

Text to use when replacing filtered content.

#### Default

```ts
'[REDACTED]'

Examples:
- '[REDACTED]' (default)
- '***'
- '####'
- '[FILTERED]'
```
