[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolSearchQuerySchema

# Variable: ToolSearchQuerySchema

> `const` **ToolSearchQuerySchema**: `ZodObject`\<\{ `q`: `ZodOptional`\<`ZodString`\>; `source`: `ZodOptional`\<`ZodString`\>; `limit`: `ZodOptional`\<`ZodPipe`\<`ZodPipe`\<`ZodString`, `ZodTransform`\<`number`, `string`\>\>, `ZodNumber`\>\>; \}, `$strip`\>

Defined in: [server/utils/validation.ts:78](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/server/utils/validation.ts#L78)

Tool search query schema
