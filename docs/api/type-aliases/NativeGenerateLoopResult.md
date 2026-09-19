[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1866)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1867)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1869](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1869)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1870](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1870)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1871](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1871)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1872)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1873](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1873)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1874](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1874)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1875](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1875)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1876](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1876)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1877](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1877)
