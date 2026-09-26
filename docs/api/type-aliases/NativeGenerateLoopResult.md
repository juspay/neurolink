[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

## Properties

### text

> **text**: `string`

---

### reasoning?

> `optional` **reasoning?**: `string`

Joined reasoning content parts from EVERY step, when the vendor sent any.

Was final-step-only until the native generate loop began accumulating
across steps; a multi-step turn would otherwise report only the reasoning
that happened after its last tool call.

---

### finishReason

> **finishReason**: `string`

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

---

### inputTokens

> **inputTokens**: `number`

---

### outputTokens

> **outputTokens**: `number`

---

### cacheReadTokens

> **cacheReadTokens**: `number`

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

---

### toolsUsed

> **toolsUsed**: `string`[]

---

### steps

> **steps**: `number`
