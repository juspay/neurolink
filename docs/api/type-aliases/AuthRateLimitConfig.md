[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthRateLimitConfig

# Type Alias: AuthRateLimitConfig

> **AuthRateLimitConfig** = `object`

Rate limit configuration per user or role.

## Properties

### maxRequests

> **maxRequests**: `number`

---

### windowMs

> **windowMs**: `number`

---

### roleLimits?

> `optional` **roleLimits?**: `Record`\<`string`, `number`\>

---

### userLimits?

> `optional` **userLimits?**: `Record`\<`string`, `number`\>

---

### skipRoles?

> `optional` **skipRoles?**: `string`[]

---

### message?

> `optional` **message?**: `string`
