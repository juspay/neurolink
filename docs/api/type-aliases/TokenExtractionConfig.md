[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenExtractionConfig

# Type Alias: TokenExtractionConfig

> **TokenExtractionConfig** = `object`

Token extraction configuration (detailed, used by middleware)

## Properties

### fromHeader?

> `optional` **fromHeader?**: `object`

Extract from Authorization header (Bearer token)

#### name?

> `optional` **name?**: `string`

#### prefix?

> `optional` **prefix?**: `string`

---

### fromCookie?

> `optional` **fromCookie?**: `object`

Extract from cookie

#### name

> **name**: `string`

---

### fromQuery?

> `optional` **fromQuery?**: `object`

Extract from query parameter

#### name

> **name**: `string`

---

### custom?

> `optional` **custom?**: (`context`) => `string` \| `null` \| `Promise`\<`string` \| `null`\>

Custom extraction function

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`string` \| `null` \| `Promise`\<`string` \| `null`\>
