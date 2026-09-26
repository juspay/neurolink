[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecuteRequestSchema

# Variable: ToolExecuteRequestSchema

> `const` **ToolExecuteRequestSchema**: `ZodObject`\<\{ `name`: `ZodString`; `arguments`: `ZodDefault`\<`ZodRecord`\<`ZodString`, `ZodUnknown`\>\>; `sessionId`: `ZodOptional`\<`ZodString`\>; `userId`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

Defined in: [server/utils/validation.ts:71](https://github.com/juspay/neurolink/blob/release/src/lib/server/utils/validation.ts#L71)

Tool execute request schema
