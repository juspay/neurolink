[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ServerServerAuthConfig

# Type Alias: ServerServerAuthConfig

> **ServerServerAuthConfig** = `object`

Defined in: [types/server.ts:1207](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1207)

Authentication configuration

## Properties

### type

> **type**: `"bearer"` \| `"api-key"` \| `"basic"` \| `"custom"`

Defined in: [types/server.ts:1209](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1209)

Authentication type

---

### validate

> **validate**: (`token`, `ctx`) => `Promise`\<[`AuthResult`](AuthResult.md) \| `null`\>

Defined in: [types/server.ts:1215](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1215)

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

Defined in: [types/server.ts:1218](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1218)

Header name for token (default: "Authorization" for bearer, "X-API-Key" for api-key)

---

### skipPaths?

> `optional` **skipPaths?**: `string`[]

Defined in: [types/server.ts:1221](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1221)

Skip authentication for certain paths

---

### errorMessage?

> `optional` **errorMessage?**: `string`

Defined in: [types/server.ts:1224](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1224)

Custom error message

---

### extractToken?

> `optional` **extractToken?**: (`ctx`) => `string` \| `null`

Defined in: [types/server.ts:1230](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1230)

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

Defined in: [types/server.ts:1242](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/server.ts#L1242)

Skip authentication for dev playground requests in non-production.
When true (default), requests with x-neurolink-dev-playground or
x-neurolink-playground header set to "true" will bypass authentication
and receive a default developer user context.

Only applies when NODE_ENV is not "production".

#### Default

```ts
true;
```
