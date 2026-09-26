[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / RouteDefinition

# Type Alias: RouteDefinition

> **RouteDefinition** = `object`

Route definition

## Properties

### method

> **method**: [`HttpMethod`](HttpMethod.md)

HTTP method

---

### path

> **path**: `string`

Route path (supports parameters like :id)

---

### handler

> **handler**: [`RouteHandler`](RouteHandler.md)

Route handler function

---

### description?

> `optional` **description?**: `string`

Route description (for documentation)

---

### requestSchema?

> `optional` **requestSchema?**: [`JsonObject`](JsonObject.md)

Request schema (for validation)

---

### responseSchema?

> `optional` **responseSchema?**: [`JsonObject`](JsonObject.md)

Response schema (for documentation)

---

### auth?

> `optional` **auth?**: `boolean`

Authentication required

---

### roles?

> `optional` **roles?**: `string`[]

Required roles

---

### rateLimit?

> `optional` **rateLimit?**: [`RateLimitConfig`](RateLimitConfig.md)

Rate limit override for this route

---

### streaming?

> `optional` **streaming?**: [`StreamingConfig`](StreamingConfig.md)

Streaming configuration

---

### tags?

> `optional` **tags?**: `string`[]

Route tags (for documentation)

---

### deprecated?

> `optional` **deprecated?**: [`RouteDeprecation`](RouteDeprecation.md)

Route deprecation information
