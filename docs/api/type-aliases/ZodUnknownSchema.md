[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ZodUnknownSchema

# Type Alias: ZodUnknownSchema

> **ZodUnknownSchema** = `ZodTypeAny`

Defined in: [types/aliases.ts:20](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/aliases.ts#L20)

Type alias for complex Zod schema type to improve readability
Used across providers and validation systems
Using ZodTypeAny to prevent infinite type recursion in zod-to-json-schema
