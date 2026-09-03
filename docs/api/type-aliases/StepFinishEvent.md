[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StepFinishEvent

# Type Alias: StepFinishEvent

> **StepFinishEvent** = `object`

Defined in: [types/providers.ts:2122](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2122)

Step finish event shape for multi-step generation.

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### toolCalls

> `readonly` **toolCalls**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2123](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2123)

---

### toolResults

> `readonly` **toolResults**: `ReadonlyArray`\<`unknown`\>

Defined in: [types/providers.ts:2124](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2124)

---

### text

> `readonly` **text**: `string`

Defined in: [types/providers.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2125)

---

### finishReason

> `readonly` **finishReason**: `string`

Defined in: [types/providers.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2126)

---

### usage

> `readonly` **usage**: `object`

Defined in: [types/providers.ts:2127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2127)

#### inputTokens?

> `optional` **inputTokens?**: `number`

#### outputTokens?

> `optional` **outputTokens?**: `number`
