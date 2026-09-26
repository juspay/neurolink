[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerServerAuthConfig

# Type Alias: ServerServerAuthConfig

> **ServerServerAuthConfig** = `object`

Authentication configuration

## Properties

### type

> **type**: `"bearer"` \| `"api-key"` \| `"basic"` \| `"custom"`

Authentication type

---

### validate

> **validate**: (`token`, `ctx`) => `Promise`\<[`AuthResult`](AuthResult.md) \| `null`\>

Token validation function
Returns user information if valid, throws or returns null if invalid

#### Parameters

##### token

`string`

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`Promise`\<[`AuthResult`](AuthResult.md) \| `null`\>

---

### headerName?

> `optional` **headerName?**: `string`

Header name for token (default: "Authorization" for bearer, "X-API-Key" for api-key)

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Skip authentication for certain paths

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Custom error message

---

### extractToken?

> `optional` **extractToken?**: (`ctx`) => `string` \| `null`

Optional token extractor for custom authentication schemes
Only used when type is "custom"

#### Parameters

##### ctx

[`ServerContext`](ServerContext.md)

#### Returns

`string` \| `null`

---

### skipDevPlayground?

> `optional` **skipDevPlayground?**: `boolean`

Skip authentication for dev playground requests in non-production.
When true (default), requests with x-neurolink-dev-playground or
x-neurolink-playground header set to "true" will bypass authentication
and receive a default developer user context.

Only applies when NODE_ENV is not "production".

#### Default

```ts
true;
```
