[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / FormField

# Type Alias: FormField

> **FormField** = `object`

Form field definition

## Properties

### name

> **name**: `string`

---

### label

> **label**: `string`

---

### type

> **type**: `"text"` \| `"number"` \| `"boolean"` \| `"select"` \| `"date"` \| `"password"`

---

### required?

> `optional` **required?**: `boolean`

---

### defaultValue?

> `optional` **defaultValue?**: [`JsonValue`](JsonValue.md)

---

### options?

> `optional` **options?**: [`SelectOption`](SelectOption.md)[]

---

### validation?

> `optional` **validation?**: `object`

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

---

### description?

> `optional` **description?**: `string`
