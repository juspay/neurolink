[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ModelConfigSchema

# Variable: ModelConfigSchema

> `const` **ModelConfigSchema**: `ZodObject`\<\{ `id`: `ZodString`; `displayName`: `ZodString`; `capabilities`: `ZodArray`\<`ZodString`\>; `deprecated`: `ZodBoolean`; `pricing`: `ZodObject`\<\{ `input`: `ZodNumber`; `output`: `ZodNumber`; \}, `$strip`\>; `contextWindow`: `ZodNumber`; `releaseDate`: `ZodString`; \}, `$strip`\>

Defined in: [types/model.ts:79](https://github.com/juspay/neurolink/blob/release/src/lib/types/model.ts#L79)

Zod schema for model configuration validation
