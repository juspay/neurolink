[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / summarizeContext

# Function: summarizeContext()

> **summarizeContext**(`context`, `maxLength?`, `provider?`): `Promise`\<`string`\>

Defined in: [rag/pipeline/contextAssembly.ts:273](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/rag/pipeline/contextAssembly.ts#L273)

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
