[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1841](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1841)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1842)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1844](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1844)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1845](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1845)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1846](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1846)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1847)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1848](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1848)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1849](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1849)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1850)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1851](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1851)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1852)
