[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ZodToJsonSchemaInput

# Type Alias: ZodToJsonSchemaInput

> **ZodToJsonSchemaInput** = `Parameters`\<_typeof_ `zodToJsonSchema`\>\[`0`\]

Defined in: [types/aliases.ts:28](https://github.com/juspay/neurolink/blob/release/src/lib/types/aliases.ts#L28)

Bridges Zod 4 schema types to the zod-to-json-schema library which still
types against Zod 3 (`zod/v3`). Zod 4 schemas are structurally compatible
at runtime but not assignable at the type level, so call sites must cast
through `unknown` to this type at the third-party boundary.
