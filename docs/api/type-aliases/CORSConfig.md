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

Allowed request headers. Default `Content-Type`, `Authorization`,
`X-Request-ID` and `X-Session-Id`. A list you pass replaces the default, it
is not added to it, so keep the ones your clients send, and add the header
name of a custom `createSessionMiddleware({ headerName })`.

---

### credentials?

> `optional` **credentials?**: `boolean`

Allow credentials

---

### maxAge?

> `optional` **maxAge?**: `number`

Preflight cache max age in seconds
