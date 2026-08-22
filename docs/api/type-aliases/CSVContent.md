[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / CSVContent

# Type Alias: CSVContent

> **CSVContent** = `object`

Defined in: [types/multimodal.ts:81](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L81)

CSV content type for multimodal messages

## Properties

### type

> **type**: `"csv"`

Defined in: [types/multimodal.ts:82](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L82)

---

### data

> **data**: `Buffer` \| `string`

Defined in: [types/multimodal.ts:83](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L83)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/multimodal.ts:84](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L84)

#### filename?

> `optional` **filename?**: `string`

#### maxRows?

> `optional` **maxRows?**: `number`

#### formatStyle?

> `optional` **formatStyle?**: `"raw"` \| `"markdown"` \| `"json"`

#### description?

> `optional` **description?**: `string`
