[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGeminiCliTokens

# Type Alias: LocalUsageGeminiCliTokens

> **LocalUsageGeminiCliTokens** = `object`

Defined in: [types/localUsage.ts:297](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L297)

The `tokens` object exactly as Gemini CLI writes it onto a `type: "gemini"`
message record — mapped straight from the GenAI response's own
`usageMetadata` by the CLI's own `recordMessageTokens()`. See
`geminiCliReader.ts` for why `cached` is subtracted out of `input` rather
than added, and why `thoughts`/`tool` fold into output.

## Properties

### input?

> `optional` **input?**: `number`

Defined in: [types/localUsage.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L298)

---

### output?

> `optional` **output?**: `number`

Defined in: [types/localUsage.ts:299](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L299)

---

### cached?

> `optional` **cached?**: `number`

Defined in: [types/localUsage.ts:300](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L300)

---

### thoughts?

> `optional` **thoughts?**: `number`

Defined in: [types/localUsage.ts:301](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L301)

---

### tool?

> `optional` **tool?**: `number`

Defined in: [types/localUsage.ts:302](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L302)

---

### total?

> `optional` **total?**: `number`

Defined in: [types/localUsage.ts:303](https://github.com/juspay/neurolink/blob/release/src/lib/types/localUsage.ts#L303)
