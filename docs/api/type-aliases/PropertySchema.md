[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / PropertySchema

# Type Alias: PropertySchema

> **PropertySchema** = `object`

Defined in: [types/middleware.ts:506](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L506)

Schema for an individual property in ValidationSchema.

## Properties

### type

> **type**: `"string"` \| `"number"` \| `"boolean"` \| `"object"` \| `"array"`

Defined in: [types/middleware.ts:507](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L507)

---

### minimum?

> `optional` **minimum?**: `number`

Defined in: [types/middleware.ts:508](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L508)

---

### maximum?

> `optional` **maximum?**: `number`

Defined in: [types/middleware.ts:509](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L509)

---

### minLength?

> `optional` **minLength?**: `number`

Defined in: [types/middleware.ts:510](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L510)

---

### maxLength?

> `optional` **maxLength?**: `number`

Defined in: [types/middleware.ts:511](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L511)

---

### minItems?

> `optional` **minItems?**: `number`

Defined in: [types/middleware.ts:512](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L512)

---

### maxItems?

> `optional` **maxItems?**: `number`

Defined in: [types/middleware.ts:513](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L513)

---

### pattern?

> `optional` **pattern?**: `string`

Defined in: [types/middleware.ts:514](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L514)

---

### enum?

> `optional` **enum?**: `unknown`[]

Defined in: [types/middleware.ts:515](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L515)

---

### default?

> `optional` **default?**: `unknown`

Defined in: [types/middleware.ts:516](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L516)

---

### validate?

> `optional` **validate?**: (`value`) => `boolean` \| `string`

Defined in: [types/middleware.ts:517](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/middleware.ts#L517)

#### Parameters

##### value

`unknown`

#### Returns

`boolean` \| `string`
