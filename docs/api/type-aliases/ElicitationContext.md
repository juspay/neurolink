[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationContext

# Type Alias: ElicitationContext

> **ElicitationContext** = `object`

Defined in: [types/elicitation.ts:291](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L291)

Elicitation context passed to tools

## Properties

### confirm

> **confirm**: (`message`, `options?`) => `Promise`\<`boolean`\>

Defined in: [types/elicitation.ts:295](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L295)

Request user confirmation

#### Parameters

##### message

`string`

##### options?

###### confirmLabel?

`string`

###### cancelLabel?

`string`

#### Returns

`Promise`\<`boolean`\>

---

### getText

> **getText**: (`message`, `options?`) => `Promise`\<`string` \| `undefined`\>

Defined in: [types/elicitation.ts:303](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L303)

Request text input

#### Parameters

##### message

`string`

##### options?

###### placeholder?

`string`

###### defaultValue?

`string`

#### Returns

`Promise`\<`string` \| `undefined`\>

---

### select

> **select**: \<`T`\>(`message`, `options`) => `Promise`\<`T` \| `undefined`\>

Defined in: [types/elicitation.ts:311](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L311)

Request selection

#### Type Parameters

##### T

`T` _extends_ `string`

#### Parameters

##### message

`string`

##### options

`object`[]

#### Returns

`Promise`\<`T` \| `undefined`\>

---

### multiSelect

> **multiSelect**: \<`T`\>(`message`, `options`) => `Promise`\<`T`[] \| `undefined`\>

Defined in: [types/elicitation.ts:319](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L319)

Request multiple selections

#### Type Parameters

##### T

`T` _extends_ `string`

#### Parameters

##### message

`string`

##### options

`object`[]

#### Returns

`Promise`\<`T`[] \| `undefined`\>

---

### form

> **form**: \<`T`\>(`message`, `fields`) => `Promise`\<`T` \| `undefined`\>

Defined in: [types/elicitation.ts:327](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L327)

Request form input

#### Type Parameters

##### T

`T` _extends_ `Record`\<`string`, `unknown`\>

#### Parameters

##### message

`string`

##### fields

[`FormField`](FormField.md)[]

#### Returns

`Promise`\<`T` \| `undefined`\>

---

### request

> **request**: (`elicitation`) => `Promise`\<[`ElicitationResponse`](ElicitationResponse.md)\>

Defined in: [types/elicitation.ts:335](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/elicitation.ts#L335)

Request raw elicitation

#### Parameters

##### elicitation

`Omit`\<[`Elicitation`](Elicitation.md), `"id"`\>

#### Returns

`Promise`\<[`ElicitationResponse`](ElicitationResponse.md)\>
