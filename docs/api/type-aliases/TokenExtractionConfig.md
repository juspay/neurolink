[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TokenExtractionConfig

# Type Alias: TokenExtractionConfig

> **TokenExtractionConfig** = `object`

Defined in: [types/auth.ts:456](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L456)

Token extraction configuration (detailed, used by middleware)

## Properties

### fromHeader?

> `optional` **fromHeader?**: `object`

Defined in: [types/auth.ts:458](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L458)

Extract from Authorization header (Bearer token)

#### name?

> `optional` **name?**: `string`

#### prefix?

> `optional` **prefix?**: `string`

---

### fromCookie?

> `optional` **fromCookie?**: `object`

Defined in: [types/auth.ts:463](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L463)

Extract from cookie

#### name

> **name**: `string`

---

### fromQuery?

> `optional` **fromQuery?**: `object`

Defined in: [types/auth.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L467)

Extract from query parameter

#### name

> **name**: `string`

---

### custom?

> `optional` **custom?**: (`context`) => `string` \| `null` \| `Promise`\<`string` \| `null`\>

Defined in: [types/auth.ts:471](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/auth.ts#L471)

Custom extraction function

#### Parameters

##### context

[`AuthRequestContext`](AuthRequestContext.md)

#### Returns

`string` \| `null` \| `Promise`\<`string` \| `null`\>
