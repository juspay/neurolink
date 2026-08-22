[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageContent

# Type Alias: ImageContent

> **ImageContent** = `object`

Defined in: [types/multimodal.ts:58](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L58)

Image content type for multimodal messages

## Properties

### type

> **type**: `"image"`

Defined in: [types/multimodal.ts:59](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L59)

---

### data

> **data**: `Buffer` \| `string`

Defined in: [types/multimodal.ts:60](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L60)

---

### altText?

> `optional` **altText?**: `string`

Defined in: [types/multimodal.ts:62](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L62)

Alternative text for accessibility (screen readers, SEO)

---

### mediaType?

> `optional` **mediaType?**: `"image/jpeg"` \| `"image/png"` \| `"image/gif"` \| `"image/webp"` \| `"image/bmp"` \| `"image/tiff"`

Defined in: [types/multimodal.ts:63](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L63)

---

### metadata?

> `optional` **metadata?**: `object`

Defined in: [types/multimodal.ts:70](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/multimodal.ts#L70)

#### description?

> `optional` **description?**: `string`

#### quality?

> `optional` **quality?**: `"low"` \| `"high"` \| `"auto"`

#### dimensions?

> `optional` **dimensions?**: `object`

##### dimensions.width

> **width**: `number`

##### dimensions.height

> **height**: `number`

#### filename?

> `optional` **filename?**: `string`
