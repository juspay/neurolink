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

Allowed browser origins. Default `[]`: no cross-origin page may call the
server until an origin is listed; `["*"]` opts in to any origin.

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
