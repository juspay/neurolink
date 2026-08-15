[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / MiddlewareRequestSchema

# Type Alias: MiddlewareRequestSchema

> **MiddlewareRequestSchema** = `object`

Defined in: [types/middleware.ts:499](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L499)

Simple structural validation schema used by the request-validation
middleware. Named MiddlewareRequestSchema to disambiguate from the zod
`ValidationSchema` exported from aliases.ts (§Rule 9 domain prefix).

## Properties

### required?

> `optional` **required?**: `string`[]

Defined in: [types/middleware.ts:500](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L500)

---

### properties?

> `optional` **properties?**: `Record`\<`string`, [`PropertySchema`](PropertySchema.md)\>

Defined in: [types/middleware.ts:501](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L501)

---

### additionalProperties?

> `optional` **additionalProperties?**: `boolean`

Defined in: [types/middleware.ts:502](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/middleware.ts#L502)
