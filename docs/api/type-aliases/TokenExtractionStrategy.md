[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenExtractionStrategy

# Type Alias: TokenExtractionStrategy

> **TokenExtractionStrategy** = `object`

Defined in: [types/auth.ts:479](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L479)

Token extraction configuration (simple strategy)

## Properties

### fromHeader?

> `optional` **fromHeader?**: `object`

Defined in: [types/auth.ts:481](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L481)

Extract from Authorization header

#### name

> **name**: `string`

#### scheme?

> `optional` **scheme?**: `string`

---

### fromCookie?

> `optional` **fromCookie?**: `object`

Defined in: [types/auth.ts:486](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L486)

Extract from cookie

#### name

> **name**: `string`

---

### fromQuery?

> `optional` **fromQuery?**: `object`

Defined in: [types/auth.ts:490](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L490)

Extract from query parameter

#### name

> **name**: `string`

---

### custom?

> `optional` **custom?**: (`context`) => `string` \| `null` \| `Promise`\<`string` \| `null`\>

Defined in: [types/auth.ts:494](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L494)

Custom extraction function (may be sync or async)

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`string` \| `null` \| `Promise`\<`string` \| `null`\>
