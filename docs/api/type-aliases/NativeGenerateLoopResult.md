[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeGenerateLoopResult

# Type Alias: NativeGenerateLoopResult

> **NativeGenerateLoopResult** = `object`

Defined in: [types/generate.ts:1995](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1995)

## Properties

### text

> **text**: `string`

Defined in: [types/generate.ts:1996](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L1996)

---

### reasoning?

> `optional` **reasoning?**: `string`

Defined in: [types/generate.ts:2004](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L2004)

Joined reasoning content parts from EVERY step, when the vendor sent any.

Was final-step-only until the native generate loop began accumulating
across steps; a multi-step turn would otherwise report only the reasoning
that happened after its last tool call.

---

### finishReason

> **finishReason**: `string`

Defined in: [types/generate.ts:2005](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L2005)

---

### rawFinishReason?

> `optional` **rawFinishReason?**: `string`

Defined in: [types/generate.ts:2006](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L2006)

---

### inputTokens

> **inputTokens**: `number`

Defined in: [types/generate.ts:2007](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L2007)

---

### outputTokens

> **outputTokens**: `number`

Defined in: [types/generate.ts:2008](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L2008)

---

### cacheReadTokens

> **cacheReadTokens**: `number`

Defined in: [types/generate.ts:2009](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L2009)

---

### cacheWriteTokens

> **cacheWriteTokens**: `number`

Defined in: [types/generate.ts:2010](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L2010)

---

### toolsUsed

> **toolsUsed**: `string`[]

Defined in: [types/generate.ts:2011](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L2011)

---

### steps

> **steps**: `number`

Defined in: [types/generate.ts:2012](https://github.com/juspay/neurolink/blob/release/src/lib/types/generate.ts#L2012)
