[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1849](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1849)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1850)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1852)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1853)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1854)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1855)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1856](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1856)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1857)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1858](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1858)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1859)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1860)
