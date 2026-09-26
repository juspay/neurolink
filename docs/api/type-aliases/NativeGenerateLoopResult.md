[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1902](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1902)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1903](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1903)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:1911](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1911)

Joined reasoning content parts from EVERY step, when the vendor sent any.

Was final-step-only until the native generate loop began accumulating
across steps; a multi-step turn would otherwise report only the reasoning
that happened after its last tool call.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:1912](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1912)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:1913](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1913)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:1914](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1914)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:1915](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1915)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:1916](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1916)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:1917](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1917)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:1918](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1918)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:1919](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1919)
