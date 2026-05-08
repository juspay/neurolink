[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ToolSearchQuerySchema

# Variable: ToolSearchQuerySchema

> `const` **ToolSearchQuerySchema**: `ZodObject`\<\{ `q`: `ZodOptional`\<`ZodString`\>; `source`: `ZodOptional`\<`ZodString`\>; `limit`: `ZodOptional`\<`ZodPipe`\<`ZodPipe`\<`ZodString`, `ZodTransform`\<`number`, `string`\>\>, `ZodNumber`\>\>; \}, `$strip`\>

Defined in: [server/utils/validation.ts:78](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/server/utils/validation.ts#L78)

Tool search query schema
