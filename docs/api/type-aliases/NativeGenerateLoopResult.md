[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1817](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1817)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1818](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1818)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1820](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1820)

Joined reasoning content parts from the final step, when the vendor sent any.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1821](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1821)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1822](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1822)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1823](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1823)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1824](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1824)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1825](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1825)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1826](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1826)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1827](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1827)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1828](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1828)
