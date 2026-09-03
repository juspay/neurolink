[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareRequestSchema

# Type Alias: MiddlewareRequestSchema

> **MiddlewareRequestSchema** = `object`

Defined in: [types/middleware.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L493)

Simple structural validation schema used by the request-validation
middleware. Named MiddlewareRequestSchema to disambiguate from the zod
`ValidationSchema` exported from aliases.ts (§Rule 9 domain prefix).

## Properties

### required?

> `optional` **required?**: `string`[]

Defined in: [types/middleware.ts:494](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L494)

---

### properties?

> `optional` **properties?**: `Record`\<`string`, [`PropertySchema`](PropertySchema.md)\>

Defined in: [types/middleware.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L495)

---

### additionalProperties?

> `optional` **additionalProperties?**: `boolean`

Defined in: [types/middleware.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/middleware.ts#L496)
