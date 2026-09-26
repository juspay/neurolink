[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerServerAuthConfig

# Type Alias: ServerServerAuthConfig

> **ServerServerAuthConfig** = `object`

Defined in: [types/server.ts:1216](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1216)

Authentication configuration

## Properties

### type

> **type**: `"bearer"` \| `"api-key"` \| `"basic"` \| `"custom"`

Defined in: [types/server.ts:1218](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1218)

Authentication type

---

### validate

> **validate**: (`token`, `ctx`) => `Promise`\<[`AuthResult`](AuthResult.md) \| `null`\>

Defined in: [types/server.ts:1224](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1224)

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

Defined in: [types/server.ts:1227](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1227)

Header name for token (default: "Authorization" for bearer, "X-API-Key" for api-key)

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/server.ts:1230](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1230)

Skip authentication for certain paths

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/server.ts:1233](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1233)

Custom error message

---

### extractToken?

> `optional` **extractToken?**: (`ctx`) => `string` \| `null`

Defined in: [types/server.ts:1239](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1239)

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

Defined in: [types/server.ts:1251](https://github.com/juspay/neurolink/blob/release/src/lib/types/server.ts#L1251)

Skip authentication for dev playground requests in non-production.
When true (default), requests with x-neurolink-dev-playground or
x-neurolink-playground header set to "true" will bypass authentication
and receive a default developer user context.

Only applies when NODE_ENV is not "production".

#### Default

```ts
true;
```
