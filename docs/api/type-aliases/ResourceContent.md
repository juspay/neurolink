[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResourceContent

# Type Alias: ResourceContent

> **ResourceContent** = `object`

Resource content returned when reading a resource

## Properties

### uri

> **uri**: `string`

Resource URI

---

### mimeType?

> `optional` **mimeType?**: `string`

MIME type

---

### text?

> `optional` **text?**: `string`

Text content (for text/\* MIME types)

---

### blob?

> `optional` **blob?**: `string`

Binary content as base64 (for non-text MIME types)
