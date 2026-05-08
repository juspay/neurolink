[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / PropertySchema

# Type Alias: PropertySchema

> **PropertySchema** = `object`

Defined in: [types/middleware.ts:448](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L448)

Schema for an individual property in ValidationSchema.

## Properties

### type

> **type**: `"string"` \| `"number"` \| `"boolean"` \| `"object"` \| `"array"`

Defined in: [types/middleware.ts:449](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L449)

---

### minimum?

> `optional` **minimum?**: `number`

Defined in: [types/middleware.ts:450](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L450)

---

### maximum?

> `optional` **maximum?**: `number`

Defined in: [types/middleware.ts:451](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L451)

---

### minLength?

> `optional` **minLength?**: `number`

Defined in: [types/middleware.ts:452](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L452)

---

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/middleware.ts:453](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L453)

---

### minItems?

> `optional` **minItems?**: `number`

Defined in: [types/middleware.ts:454](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L454)

---

### maxItems?

> `optional` **maxItems?**: `number`

Defined in: [types/middleware.ts:455](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L455)

---

### pattern?

> `optional` **pattern?**: `string`

Defined in: [types/middleware.ts:456](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L456)

---

### enum?

> `optional` **enum?**: `unknown`[]

Defined in: [types/middleware.ts:457](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L457)

---

### default?

> `optional` **default?**: `unknown`

Defined in: [types/middleware.ts:458](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L458)

---

### validate?

> `optional` **validate?**: (`value`) => `boolean` \| `string`

Defined in: [types/middleware.ts:459](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/middleware.ts#L459)

#### Parameters

##### value

`unknown`

#### Returns

`boolean` \| `string`
