[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecuteRequestSchema

# Variable: AgentExecuteRequestSchema

> `const` **AgentExecuteRequestSchema**: `ZodObject`\<\{ `input`: `ZodUnion`\<readonly \[`ZodString`, `ZodObject`\<\{ `text`: `ZodString`; `images`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `files`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; \}, `$strip`\>\]\>; `provider`: `ZodOptional`\<`ZodString`\>; `model`: `ZodOptional`\<`ZodString`\>; `systemPrompt`: `ZodOptional`\<`ZodString`\>; `temperature`: `ZodOptional`\<`ZodNumber`\>; `maxTokens`: `ZodOptional`\<`ZodNumber`\>; `tools`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `stream`: `ZodOptional`\<`ZodBoolean`\>; `sessionId`: `ZodOptional`\<`ZodString`\>; `userId`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

Defined in: [server/utils/validation.ts:19](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/utils/validation.ts#L19)

Agent execute request schema
