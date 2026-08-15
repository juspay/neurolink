[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / Zod4NativeTarget

# Type Alias: Zod4NativeTarget

> **Zod4NativeTarget** = `"draft-07"` \| `"openapi-3.0"`

Defined in: [types/aliases.ts:36](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/aliases.ts#L36)

Dialects accepted by Zod 4's native `z.toJSONSchema(schema, { target })`.
Note the `.` in `"openapi-3.0"`: this differs from the `zod-to-json-schema`
package's `"openApi3"` form. The schemaConversion helper maps between the
two so internal call sites can use a single `"openApi3"` identifier.
