[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecuteRequestSchema

# Variable: AgentExecuteRequestSchema

> `const` **AgentExecuteRequestSchema**: `ZodObject`\<\{ `input`: `ZodUnion`\<readonly \[`ZodString`, `ZodObject`\<\{ `text`: `ZodString`; `images`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `files`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; \}, `$strip`\>\]\>; `provider`: `ZodOptional`\<`ZodString`\>; `model`: `ZodOptional`\<`ZodString`\>; `systemPrompt`: `ZodOptional`\<`ZodString`\>; `temperature`: `ZodOptional`\<`ZodNumber`\>; `maxTokens`: `ZodOptional`\<`ZodNumber`\>; `tools`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `stream`: `ZodOptional`\<`ZodBoolean`\>; `sessionId`: `ZodOptional`\<`ZodString`\>; `userId`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

Defined in: [server/utils/validation.ts:19](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/utils/validation.ts#L19)

Agent execute request schema
