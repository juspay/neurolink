[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1890](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1890)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1891)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1899](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1899)

Joined reasoning content parts from EVERY step, when the vendor sent any.

Was final-step-only until the native generate loop began accumulating
across steps; a multi-step turn would otherwise report only the reasoning
that happened after its last tool call.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1900](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1900)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1901](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1901)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1902](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1902)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1903)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1904](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1904)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1905](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1905)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1906](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1906)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1907](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1907)
