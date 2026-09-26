[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AgentExecuteRequestSchema

# Variable: AgentExecuteRequestSchema

> `const` **AgentExecuteRequestSchema**: `ZodObject`\<\{ `input`: `ZodUnion`\<readonly \[`ZodString`, `ZodObject`\<\{ `text`: `ZodString`; `images`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `files`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; \}, `$strip`\>\]\>; `provider`: `ZodOptional`\<`ZodString`\>; `model`: `ZodOptional`\<`ZodString`\>; `systemPrompt`: `ZodOptional`\<`ZodString`\>; `temperature`: `ZodOptional`\<`ZodNumber`\>; `maxTokens`: `ZodOptional`\<`ZodNumber`\>; `tools`: `ZodOptional`\<`ZodArray`\<`ZodString`\>\>; `stream`: `ZodOptional`\<`ZodBoolean`\>; `sessionId`: `ZodOptional`\<`ZodString`\>; `userId`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

Agent execute request schema
