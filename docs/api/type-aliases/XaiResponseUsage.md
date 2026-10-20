[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / XaiResponseUsage

# Type Alias: XaiResponseUsage

> **XaiResponseUsage** = `object`

Token counts of one xAI response. xAI sends them at the top level of
`response.done`; the plugin reads `response.usage`, which xAI leaves empty.

## Properties

### inputTokens

> **inputTokens**: `number`

---

### inputAudioTokens

> **inputAudioTokens**: `number`

---

### outputTokens

> **outputTokens**: `number`

---

### outputAudioTokens

> **outputAudioTokens**: `number`
