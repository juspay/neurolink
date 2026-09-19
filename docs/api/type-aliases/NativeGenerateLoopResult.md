[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1905)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1906](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1906)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1908](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1908)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1909](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1909)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1910](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1910)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1911](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1911)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1912)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1913)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1914](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1914)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1915)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1916)
