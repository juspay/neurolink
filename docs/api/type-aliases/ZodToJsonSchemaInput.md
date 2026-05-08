[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ZodToJsonSchemaInput

# Type Alias: ZodToJsonSchemaInput

> **ZodToJsonSchemaInput** = `Parameters`\<_typeof_ `zodToJsonSchema`\>\[`0`\]

Defined in: [types/aliases.ts:28](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/aliases.ts#L28)

Bridges Zod 4 schema types to the zod-to-json-schema library which still
types against Zod 3 (`zod/v3`). Zod 4 schemas are structurally compatible
at runtime but not assignable at the type level, so call sites must cast
through `unknown` to this type at the third-party boundary.
