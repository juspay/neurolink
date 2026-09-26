[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRequestContext

# Type Alias: AuthRequestContext

> **AuthRequestContext** = `object`

Authentication request context

## Properties

### method?

> `optional` **method?**: `string`

HTTP method

---

### path?

> `optional` **path?**: `string`

Request URL/path

---

### headers

> **headers**: `Record`\<`string`, `string` \| `string`[] \| `undefined`\>

HTTP request headers

---

### cookies?

> `optional` **cookies?**: `Record`\<`string`, `string`\>

Request cookies

---

### query?

> `optional` **query?**: `Record`\<`string`, `string` \| `string`[] \| `undefined`\>

Query parameters

---

### body?

> `optional` **body?**: `unknown`

Request body (if available)

---

### ip?

> `optional` **ip?**: `string`

IP address

---

### ipAddress?

> `optional` **ipAddress?**: `string`

IP address (alias for session builders that expect this field)

---

### userAgent?

> `optional` **userAgent?**: `string`

Request user agent

---

### requestId?

> `optional` **requestId?**: `string`

Request ID for tracing
