[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepFinishEvent

# Type Alias: StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [types/providers.ts:1778](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1778)

Step finish event shape for multi-step generation.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### toolCalls

> `readonly` **toolCalls**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:1779](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1779)

---

### toolResults

> `readonly` **toolResults**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:1780](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1780)

---

### text

> `readonly` **text**: `string`

Defined in: [types/providers.ts:1781](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1781)

---

### finishReason

> `readonly` **finishReason**: `string`

Defined in: [types/providers.ts:1782](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1782)

---

### usage

> `readonly` **usage**: `object`

Defined in: [types/providers.ts:1783](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/providers.ts#L1783)

#### inputTokens?

> `optional` **inputTokens?**: `number`

#### outputTokens?

> `optional` **outputTokens?**: `number`
