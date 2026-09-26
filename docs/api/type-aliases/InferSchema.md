[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InferSchema

# Type Alias: InferSchema\<SCHEMA\>

> **InferSchema**\<`SCHEMA`\> = `SCHEMA` _extends_ `ZodSchema`\<infer T\> ? `T` : `SCHEMA` _extends_ `StandardSchema`\<infer T\> ? `T` : `SCHEMA` _extends_ `LazySchema`\<infer T\> ? `T` : `SCHEMA` _extends_ [`Schema`](Schema.md)\<infer T\> ? `T` : `never`

## Type Parameters

### SCHEMA

`SCHEMA`
