[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / Zod4NativeTarget

# Type Alias: Zod4NativeTarget

> **Zod4NativeTarget** = `"draft-07"` \| `"openapi-3.0"`

Defined in: [types/aliases.ts:36](https://github.com/juspay/neurolink/blob/release/src/lib/types/aliases.ts#L36)

Dialects accepted by Zod 4's native `z.toJSONSchema(schema, { target })`.
Note the `.` in `"openapi-3.0"`: this differs from the `zod-to-json-schema`
package's `"openApi3"` form. The schemaConversion helper maps between the
two so internal call sites can use a single `"openApi3"` identifier.
