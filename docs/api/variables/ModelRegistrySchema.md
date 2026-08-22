[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRegistrySchema

# Variable: ModelRegistrySchema

> `const` **ModelRegistrySchema**: `ZodObject`\<\{ `version`: `ZodString`; `lastUpdated`: `ZodString`; `models`: `ZodRecord`\<`ZodString`, `ZodRecord`\<`ZodString`, `ZodObject`\<\{ `id`: `ZodString`; `displayName`: `ZodString`; `capabilities`: `ZodArray`\<`ZodString`\>; `deprecated`: `ZodBoolean`; `pricing`: `ZodObject`\<\{ `input`: `ZodNumber`; `output`: `ZodNumber`; \}, `$strip`\>; `contextWindow`: `ZodNumber`; `releaseDate`: `ZodString`; \}, `$strip`\>\>\>; `aliases`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodString`\>\>; `defaults`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodString`\>\>; \}, `$strip`\>

Defined in: [types/model.ts:95](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/model.ts#L95)

Zod schema for model registry validation
