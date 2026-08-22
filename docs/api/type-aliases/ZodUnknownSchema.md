[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ZodUnknownSchema

# Type Alias: ZodUnknownSchema

> **ZodUnknownSchema** = `ZodTypeAny`

Defined in: [types/aliases.ts:20](https://github.com/juspay/neurolink/blob/release/src/lib/types/aliases.ts#L20)

Type alias for complex Zod schema type to improve readability
Used across providers and validation systems
Using ZodTypeAny to prevent infinite type recursion in zod-to-json-schema
