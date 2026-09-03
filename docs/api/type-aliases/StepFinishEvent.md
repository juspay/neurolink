[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepFinishEvent

# Type Alias: StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [types/providers.ts:2112](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2112)

Step finish event shape for multi-step generation.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### toolCalls

> `readonly` **toolCalls**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2113](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2113)

---

### toolResults

> `readonly` **toolResults**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2114](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2114)

---

### text

> `readonly` **text**: `string`

Defined in: [types/providers.ts:2115](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2115)

---

### finishReason

> `readonly` **finishReason**: `string`

Defined in: [types/providers.ts:2116](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2116)

---

### usage

> `readonly` **usage**: `object`

Defined in: [types/providers.ts:2117](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2117)

#### inputTokens?

> `optional` **inputTokens?**: `number`

#### outputTokens?

> `optional` **outputTokens?**: `number`
