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

Defined in: [types/generate.ts:1846](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1846)

Joined reasoning content parts from EVERY step, when the vendor sent any.

Was final-step-only until the native generate loop began accumulating
across steps; a multi-step turn would otherwise report only the reasoning
that happened after its last tool call.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1847)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1848](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1848)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1849](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1849)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1850)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1851](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1851)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1852](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1852)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1853)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1854)
