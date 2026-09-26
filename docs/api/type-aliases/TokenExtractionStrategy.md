[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenExtractionStrategy

# Type Alias: TokenExtractionStrategy

> **TokenExtractionStrategy** = `object`

Token extraction configuration (simple strategy)

## Properties

### fromHeader?

> `optional` **fromHeader?**: `object`

Extract from Authorization header

#### name

> **name**: `string`

#### scheme?

> `optional` **scheme?**: `string`

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

Custom extraction function (may be sync or async)

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`string` \| `null` \| `Promise`\<`string` \| `null`\>
