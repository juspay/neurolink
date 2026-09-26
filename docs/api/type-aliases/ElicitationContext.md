[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ElicitationContext

# Type Alias: ElicitationContext

> **ElicitationContext** = `object`

Elicitation context passed to tools

## Properties

### confirm

> **confirm**: (`message`, `options?`) => `Promise`\<`boolean`\>

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

Request raw elicitation

#### Parameters

##### elicitation

`Omit`\<[`Elicitation`](Elicitation.md), `"id"`\>

#### Returns

`Promise`\<[`ElicitationResponse`](ElicitationResponse.md)\>
