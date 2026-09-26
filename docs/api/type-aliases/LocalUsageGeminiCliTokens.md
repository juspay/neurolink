[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / LocalUsageGeminiCliTokens

# Type Alias: LocalUsageGeminiCliTokens

> **LocalUsageGeminiCliTokens** = `object`

The `tokens` object exactly as Gemini CLI writes it onto a `type: "gemini"`
message record — mapped straight from the GenAI response's own
`usageMetadata` by the CLI's own `recordMessageTokens()`. See
`geminiCliReader.ts` for why `cached` is subtracted out of `input` rather
than added, and why `thoughts`/`tool` fold into output.

## Properties

### input?

> `optional` **input?**: `number`

---

### output?

> `optional` **output?**: `number`

---

### cached?

> `optional` **cached?**: `number`

---

### thoughts?

> `optional` **thoughts?**: `number`

---

### tool?

> `optional` **tool?**: `number`

---

### total?

> `optional` **total?**: `number`
