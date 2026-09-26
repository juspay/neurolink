[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1936)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1937](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1937)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1945](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1945)

Joined reasoning content parts from EVERY step, when the vendor sent any.

Was final-step-only until the native generate loop began accumulating
across steps; a multi-step turn would otherwise report only the reasoning
that happened after its last tool call.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1946](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1946)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1947](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1947)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1948](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1948)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1949](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1949)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1950](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1950)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1951](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1951)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1952](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1952)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1953](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1953)
