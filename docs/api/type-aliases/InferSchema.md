[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / InferSchema

# Type Alias: InferSchema\<SCHEMA\>

> **InferSchema**\<`SCHEMA`\> = `SCHEMA` _extends_ `ZodSchema`\<infer T\> ? `T` : `SCHEMA` _extends_ `StandardSchema`\<infer T\> ? `T` : `SCHEMA` _extends_ `LazySchema`\<infer T\> ? `T` : `SCHEMA` _extends_ [`Schema`](Schema.md)\<infer T\> ? `T` : `never`

Defined in: [types/aiCompat.ts:75](https://github.com/juspay/neurolink/blob/release/src/lib/types/aiCompat.ts#L75)

## Type Parameters

### SCHEMA

`SCHEMA`
