[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CORSConfig

# Type Alias: CORSConfig

> **CORSConfig** = `object`

CORS configuration

## Properties

### enabled?

> `optional` **enabled?**: `boolean`

Enable CORS (default: true)

---

### origins?

> `optional` **origins?**: `string`[]

Allowed origins (default: ["*"])

---

### methods?

> `optional` **methods?**: `string`[]

Allowed HTTP methods

---

### headers?

> `optional` **headers?**: `string`[]

Allowed headers

---

### credentials?

> `optional` **credentials?**: `boolean`

Allow credentials

---

### maxAge?

> `optional` **maxAge?**: `number`

Preflight cache max age in seconds
