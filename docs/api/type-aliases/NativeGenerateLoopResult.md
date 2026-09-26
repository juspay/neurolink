[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1900](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1900)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1901](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1901)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1903)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1904](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1904)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1905)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1906](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1906)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1907](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1907)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1908](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1908)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1909](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1909)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1910](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1910)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1911](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1911)
