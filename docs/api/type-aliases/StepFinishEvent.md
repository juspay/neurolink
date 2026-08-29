[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepFinishEvent

# Type Alias: StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [types/providers.ts:2104](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2104)

Step finish event shape for multi-step generation.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### toolCalls

> `readonly` **toolCalls**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2105)

---

### toolResults

> `readonly` **toolResults**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2106](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2106)

---

### text

> `readonly` **text**: `string`

Defined in: [types/providers.ts:2107](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2107)

---

### finishReason

> `readonly` **finishReason**: `string`

Defined in: [types/providers.ts:2108](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2108)

---

### usage

> `readonly` **usage**: `object`

Defined in: [types/providers.ts:2109](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2109)

#### inputTokens?

> `optional` **inputTokens?**: `number`

#### outputTokens?

> `optional` **outputTokens?**: `number`
