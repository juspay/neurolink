[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelRegistrySchema

# Variable: ModelRegistrySchema

> `const` **ModelRegistrySchema**: `ZodObject`\<\{ `version`: `ZodString`; `lastUpdated`: `ZodString`; `models`: `ZodRecord`\<`ZodString`, `ZodRecord`\<`ZodString`, `ZodObject`\<\{ `id`: `ZodString`; `displayName`: `ZodString`; `capabilities`: `ZodArray`\<`ZodString`\>; `deprecated`: `ZodBoolean`; `pricing`: `ZodObject`\<\{ `input`: `ZodNumber`; `output`: `ZodNumber`; \}, `$strip`\>; `contextWindow`: `ZodNumber`; `releaseDate`: `ZodString`; \}, `$strip`\>\>\>; `aliases`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodString`\>\>; `defaults`: `ZodOptional`\<`ZodRecord`\<`ZodString`, `ZodString`\>\>; \}, `$strip`\>

Defined in: [types/model.ts:95](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/model.ts#L95)

Zod schema for model registry validation
