[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / FormField

# Type Alias: FormField

> **FormField** = `object`

Defined in: [types/elicitation.ts:148](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L148)

Form field definition

## Properties

### name

> **name**: `string`

Defined in: [types/elicitation.ts:149](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L149)

---

### label

> **label**: `string`

Defined in: [types/elicitation.ts:150](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L150)

---

### type

> **type**: `"text"` \| `"number"` \| `"boolean"` \| `"select"` \| `"date"` \| `"password"`

Defined in: [types/elicitation.ts:151](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L151)

---

### required?

> `optional` **required?**: `boolean`

Defined in: [types/elicitation.ts:152](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L152)

---

### defaultValue?

> `optional` **defaultValue?**: [`JsonValue`](JsonValue.md)

Defined in: [types/elicitation.ts:153](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L153)

---

### options?

> `optional` **options?**: [`SelectOption`](SelectOption.md)[]

Defined in: [types/elicitation.ts:154](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L154)

---

### validation?

> `optional` **validation?**: `object`

Defined in: [types/elicitation.ts:155](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L155)

#### min?

> `optional` **min?**: `number`

#### max?

> `optional` **max?**: `number`

#### pattern?

> `optional` **pattern?**: `string`

#### message?

> `optional` **message?**: `string`

---

### placeholder?

> `optional` **placeholder?**: `string`

Defined in: [types/elicitation.ts:161](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L161)

---

### description?

> `optional` **description?**: `string`

Defined in: [types/elicitation.ts:162](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L162)
