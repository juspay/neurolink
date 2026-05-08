[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolExecuteRequestSchema

# Variable: ToolExecuteRequestSchema

> `const` **ToolExecuteRequestSchema**: `ZodObject`\<\{ `name`: `ZodString`; `arguments`: `ZodDefault`\<`ZodRecord`\<`ZodString`, `ZodUnknown`\>\>; `sessionId`: `ZodOptional`\<`ZodString`\>; `userId`: `ZodOptional`\<`ZodString`\>; \}, `$strip`\>

Defined in: [server/utils/validation.ts:42](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/utils/validation.ts#L42)

Tool execute request schema
