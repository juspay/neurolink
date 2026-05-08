[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BadWordsConfig

# Type Alias: BadWordsConfig

> **BadWordsConfig** = `object`

Defined in: [types/guardrails.ts:88](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L88)

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/guardrails.ts:89](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L89)

---

### list?

> `optional` **list?**: `string`[]

Defined in: [types/guardrails.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L90)

---

### regexPatterns?

> `optional` **regexPatterns?**: `string`[]

Defined in: [types/guardrails.ts:91](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L91)

---

### replacementText?

> `optional` **replacementText?**: `string`

Defined in: [types/guardrails.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/guardrails.ts#L102)

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
