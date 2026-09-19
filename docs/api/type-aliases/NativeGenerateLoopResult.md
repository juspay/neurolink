[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1853)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1854)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1856](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1856)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1857)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1858](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1858)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1859)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1860)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1861)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1862](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1862)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1863](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1863)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1864)
