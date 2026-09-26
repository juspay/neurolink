[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1933](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1933)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1934](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1934)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1942](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1942)

Joined reasoning content parts from EVERY step, when the vendor sent any.

Was final-step-only until the native generate loop began accumulating
across steps; a multi-step turn would otherwise report only the reasoning
that happened after its last tool call.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1943](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1943)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1944](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1944)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1945](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1945)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1946](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1946)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1947](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1947)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1948](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1948)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1949](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1949)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1950](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1950)
