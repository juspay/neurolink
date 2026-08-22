[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / summarizeContext

# Function: summarizeContext()

> **summarizeContext**(`context`, `maxLength?`, `provider?`): `Promise`\<`string`\>

Defined in: [rag/pipeline/contextAssembly.ts:273](https://github.com/juspay/neurolink/blob/release/src/lib/rag/pipeline/contextAssembly.ts#L273)

Summarize context using LLM

## Parameters

### context

`string`

Context to summarize

### maxLength?

`number` = `500`

Maximum summary length

### provider?

LLM provider instance

#### generate

(`params`) => `Promise`\<\{ `content?`: `string`; \} \| `null`\>

## Returns

`Promise`\<`string`\>

Summarized context
