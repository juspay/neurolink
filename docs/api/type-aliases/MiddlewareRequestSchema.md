[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareRequestSchema

# Type Alias: MiddlewareRequestSchema

> **MiddlewareRequestSchema** = `object`

Simple structural validation schema used by the request-validation
middleware. Named MiddlewareRequestSchema to disambiguate from the zod
`ValidationSchema` exported from aliases.ts (§Rule 9 domain prefix).

## Properties

### required?

> `optional` **required?**: `string`[]

---

### properties?

> `optional` **properties?**: `Record`\<`string`, [`PropertySchema`](PropertySchema.md)\>

---

### additionalProperties?

> `optional` **additionalProperties?**: `boolean`
