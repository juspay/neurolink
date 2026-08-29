[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGeminiCliTokens

# Type Alias: LocalUsageGeminiCliTokens

> **LocalUsageGeminiCliTokens** = `object`

Defined in: [types/localUsage.ts:228](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L228)

The `tokens` object exactly as Gemini CLI writes it onto a `type: "gemini"`
message record — mapped straight from the GenAI response's own
`usageMetadata` by the CLI's own `recordMessageTokens()`. See
`geminiCliReader.ts` for why `cached` is subtracted out of `input` rather
than added, and why `thoughts`/`tool` fold into output.

## Properties

### input?

> `optional` **input?**: `number`

Defined in: [types/localUsage.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L229)

---

### output?

> `optional` **output?**: `number`

Defined in: [types/localUsage.ts:230](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L230)

---

### cached?

> `optional` **cached?**: `number`

Defined in: [types/localUsage.ts:231](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L231)

---

### thoughts?

> `optional` **thoughts?**: `number`

Defined in: [types/localUsage.ts:232](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L232)

---

### tool?

> `optional` **tool?**: `number`

Defined in: [types/localUsage.ts:233](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L233)

---

### total?

> `optional` **total?**: `number`

Defined in: [types/localUsage.ts:234](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L234)
