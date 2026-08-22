[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ZodUnknownSchema

# Type Alias: ZodUnknownSchema

> **ZodUnknownSchema** = `ZodTypeAny`

Defined in: [types/aliases.ts:20](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/aliases.ts#L20)

Type alias for complex Zod schema type to improve readability
Used across providers and validation systems
Using ZodTypeAny to prevent infinite type recursion in zod-to-json-schema
