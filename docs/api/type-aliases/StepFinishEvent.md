[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepFinishEvent

# Type Alias: StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [types/providers.ts:2129](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2129)

Step finish event shape for multi-step generation.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### toolCalls

> `readonly` **toolCalls**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2130](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2130)

---

### toolResults

> `readonly` **toolResults**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2131](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2131)

---

### text

> `readonly` **text**: `string`

Defined in: [types/providers.ts:2132](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2132)

---

### finishReason

> `readonly` **finishReason**: `string`

Defined in: [types/providers.ts:2133](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2133)

---

### usage

> `readonly` **usage**: `object`

Defined in: [types/providers.ts:2134](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2134)

#### inputTokens?

> `optional` **inputTokens?**: `number`

#### outputTokens?

> `optional` **outputTokens?**: `number`
