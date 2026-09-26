[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / MCPResource

# Type Alias: MCPResource

> **MCPResource** = `object`

MCP Resource definition

## Properties

### uri

> **uri**: `string`

Unique resource URI

---

### name

> **name**: `string`

Human-readable name

---

### description?

> `optional` **description?**: `string`

Resource description

---

### mimeType?

> `optional` **mimeType?**: `string`

MIME type of the resource content

---

### size?

> `optional` **size?**: `number`

Resource size in bytes (if known)

---

### dynamic?

> `optional` **dynamic?**: `boolean`

Whether the resource content can change

---

### annotations?

> `optional` **annotations?**: `object`

Resource annotations/metadata

#### audience?

> `optional` **audience?**: `string`[]

Audience description

#### priority?

> `optional` **priority?**: `number`

Priority hint (0-1)
