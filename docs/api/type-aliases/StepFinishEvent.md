[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepFinishEvent

# Type Alias: StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [types/providers.ts:2107](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2107)

Step finish event shape for multi-step generation.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### toolCalls

> `readonly` **toolCalls**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2108](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2108)

---

### toolResults

> `readonly` **toolResults**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2109](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2109)

---

### text

> `readonly` **text**: `string`

Defined in: [types/providers.ts:2110](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2110)

---

### finishReason

> `readonly` **finishReason**: `string`

Defined in: [types/providers.ts:2111](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2111)

---

### usage

> `readonly` **usage**: `object`

Defined in: [types/providers.ts:2112](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2112)

#### inputTokens?

> `optional` **inputTokens?**: `number`

#### outputTokens?

> `optional` **outputTokens?**: `number`
