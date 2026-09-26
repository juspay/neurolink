[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / PropertySchema

# Type Alias: PropertySchema

> **PropertySchema** = `object`

Schema for an individual property in ValidationSchema.

## Properties

### type

> **type**: `"string"` \| `"number"` \| `"boolean"` \| `"object"` \| `"array"`

---

### minimum?

> `optional` **minimum?**: `number`

---

### maximum?

> `optional` **maximum?**: `number`

---

### minLength?

> `optional` **minLength?**: `number`

---

### maxLength?

> `optional` **maxLength?**: `number`

---

### minItems?

> `optional` **minItems?**: `number`

---

### maxItems?

> `optional` **maxItems?**: `number`

---

### pattern?

> `optional` **pattern?**: `string`

---

### enum?

> `optional` **enum?**: `unknown`[]

---

### default?

> `optional` **default?**: `unknown`

---

### validate?

> `optional` **validate?**: (`value`) => `boolean` \| `string`

#### Parameters

##### value

`unknown`

#### Returns

`boolean` \| `string`
