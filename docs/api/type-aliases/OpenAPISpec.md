[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OpenAPISpec

# Type Alias: OpenAPISpec

> **OpenAPISpec** = `object`

Structured OpenAPI 3.1 specification object.

## Properties

### openapi

> **openapi**: `"3.1.0"`

---

### info

> **info**: [`JsonObject`](JsonObject.md)

---

### servers

> **servers**: [`JsonObject`](JsonObject.md)[]

---

### tags

> **tags**: [`JsonObject`](JsonObject.md)[]

---

### paths

> **paths**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

---

### components

> **components**: `object`

#### schemas

> **schemas**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

#### securitySchemes?

> `optional` **securitySchemes?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

#### parameters?

> `optional` **parameters?**: `Record`\<`string`, [`JsonObject`](JsonObject.md)\>

---

### security?

> `optional` **security?**: [`JsonObject`](JsonObject.md)[]
