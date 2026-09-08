[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1837](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1837)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1838](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1838)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1840](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1840)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1841](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1841)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1842](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1842)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1843](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1843)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1844](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1844)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1845](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1845)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1846](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1846)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1847)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1848](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1848)
