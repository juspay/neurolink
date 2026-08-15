[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / summarizeContext

# Function: summarizeContext()

> **summarizeContext**(`context`, `maxLength?`, `provider?`): `Promise`\<`string`\>

Defined in: [rag/pipeline/contextAssembly.ts:273](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/rag/pipeline/contextAssembly.ts#L273)

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
