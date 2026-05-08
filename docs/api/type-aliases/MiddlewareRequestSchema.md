[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareRequestSchema

# Type Alias: MiddlewareRequestSchema

> **MiddlewareRequestSchema** = `object`

Defined in: [types/middleware.ts:441](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L441)

Simple structural validation schema used by the request-validation
middleware. Named MiddlewareRequestSchema to disambiguate from the zod
`ValidationSchema` exported from aliases.ts (§Rule 9 domain prefix).

## Properties

### required?

> `optional` **required?**: `string`[]

Defined in: [types/middleware.ts:442](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L442)

---

### properties?

> `optional` **properties?**: `Record`\<`string`, [`PropertySchema`](PropertySchema.md)\>

Defined in: [types/middleware.ts:443](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L443)

---

### additionalProperties?

> `optional` **additionalProperties?**: `boolean`

Defined in: [types/middleware.ts:444](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L444)
