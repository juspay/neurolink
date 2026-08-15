[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ZodUnknownSchema

# Type Alias: ZodUnknownSchema

> **ZodUnknownSchema** = `ZodTypeAny`

Defined in: [types/aliases.ts:20](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/aliases.ts#L20)

Type alias for complex Zod schema type to improve readability
Used across providers and validation systems
Using ZodTypeAny to prevent infinite type recursion in zod-to-json-schema
