[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1857)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1858](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1858)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1860)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1861)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1862](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1862)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1863](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1863)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1864)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1865](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1865)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1866)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1867)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1868)
