[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1923](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1923)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1924](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1924)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1932](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1932)

Joined reasoning content parts from EVERY step, when the vendor sent any.

Was final-step-only until the native generate loop began accumulating
across steps; a multi-step turn would otherwise report only the reasoning
that happened after its last tool call.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1933](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1933)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1934](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1934)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1935](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1935)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1936](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1936)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1937](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1937)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1938](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1938)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1939](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1939)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1940](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1940)
