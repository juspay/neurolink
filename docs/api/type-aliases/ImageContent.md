[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ImageContent

# Type Alias: ImageContent

> **ImageContent** = `object`

Image content type for multimodal messages

## Properties

### type

> **type**: `"image"`

---

### data

> **data**: `Buffer` \| `string`

---

### altText?

> `optional` **altText?**: `string`

Alternative text for accessibility (screen readers, SEO)

---

### mediaType?

> `optional` **mediaType?**: `"image/jpeg"` \| `"image/png"` \| `"image/gif"` \| `"image/webp"` \| `"image/bmp"` \| `"image/tiff"`

---

### metadata?

> `optional` **metadata?**: `object`

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
