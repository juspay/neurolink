[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / JWTTokenManager

# Class: JWTTokenManager

Defined in: [client/auth.ts:201](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L201)

JWT Token Manager with automatic refresh

Manages JWT tokens with automatic refresh using a provided refresh function.

## Example

```typescript
const tokenManager = new JWTTokenManager({
  token: "initial-jwt-token",
  expiresAt: Date.now() + 3600000,
  refreshFn: async () => {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    const data = await response.json();
    return { accessToken: data.token, expiresIn: data.expiresIn };
  },
});
```

## Constructors

### Constructor

> **new JWTTokenManager**(`config`): `JWTTokenManager`

Defined in: [client/auth.ts:207](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L207)

#### Parameters

##### config

###### token

`string`

###### expiresAt

`number`

###### refreshFn

() => `Promise`\<[`ClientTokenRefreshResult`](../type-aliases/ClientTokenRefreshResult.md)\>

###### refreshBufferMs?

`number`

#### Returns

`JWTTokenManager`

## Methods

### getToken()

> **getToken**(): `Promise`\<`string`\>

Defined in: [client/auth.ts:223](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L223)

Get a valid access token

#### Returns

`Promise`\<`string`\>

---

### forceRefresh()

> **forceRefresh**(): `Promise`\<`string`\>

Defined in: [client/auth.ts:243](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L243)

Force token refresh

#### Returns

`Promise`\<`string`\>

---

### setToken()

> **setToken**(`token`, `expiresAt`): `void`

Defined in: [client/auth.ts:255](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L255)

Update token manually

#### Parameters

##### token

`string`

##### expiresAt

`number`

#### Returns

`void`

---

### isValid()

> **isValid**(): `boolean`

Defined in: [client/auth.ts:263](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L263)

Check if token is valid

#### Returns

`boolean`
