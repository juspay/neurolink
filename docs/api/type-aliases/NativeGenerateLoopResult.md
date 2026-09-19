[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1886](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1886)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1887)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1889](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1889)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1890](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1890)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1891](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1891)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1892](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1892)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1893](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1893)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1894](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1894)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1895](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1895)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1896](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1896)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1897](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1897)
