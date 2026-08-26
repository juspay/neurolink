[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepFinishEvent

# Type Alias: StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [types/providers.ts:2091](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2091)

Step finish event shape for multi-step generation.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### toolCalls

> `readonly` **toolCalls**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2092](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2092)

---

### toolResults

> `readonly` **toolResults**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2093](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2093)

---

### text

> `readonly` **text**: `string`

Defined in: [types/providers.ts:2094](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2094)

---

### finishReason

> `readonly` **finishReason**: `string`

Defined in: [types/providers.ts:2095](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2095)

---

### usage

> `readonly` **usage**: `object`

Defined in: [types/providers.ts:2096](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2096)

#### inputTokens?

> `optional` **inputTokens?**: `number`

#### outputTokens?

> `optional` **outputTokens?**: `number`
