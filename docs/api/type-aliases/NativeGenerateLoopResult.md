[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1939](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1939)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1940)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1948](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1948)

Joined reasoning content parts from EVERY step, when the vendor sent any.

Was final-step-only until the native generate loop began accumulating
across steps; a multi-step turn would otherwise report only the reasoning
that happened after its last tool call.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1949](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1949)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1950](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1950)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1951](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1951)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1952](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1952)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1953](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1953)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1954](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1954)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1955](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1955)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1956](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1956)
