[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IncomingRequest

# Type Alias: IncomingRequest

> **IncomingRequest** = `object`

Minimal request object accepted by the auth middleware.

## Properties

### method?

> `optional` **method?**: `string`

---

### url?

> `optional` **url?**: `string`

---

### path?

> `optional` **path?**: `string`

---

### headers?

> `optional` **headers?**: `Record`\<`string`, `string` \| `string`[] \| `undefined`\>

---

### cookies?

> `optional` **cookies?**: `Record`\<`string`, `string`\>

---

### query?

> `optional` **query?**: `Record`\<`string`, `string` \| `string`[] \| `undefined`\>

---

### body?

> `optional` **body?**: `unknown`

---

### ip?

> `optional` **ip?**: `string`

---

### user?

> `optional` **user?**: [`AuthUser`](AuthUser.md)

---

### authContext?

> `optional` **authContext?**: [`AuthenticatedContext`](AuthenticatedContext.md)
