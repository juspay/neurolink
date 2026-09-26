[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / JWTTokenManager

# Class: JWTTokenManager

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

Get a valid access token

#### Returns

`Promise`\<`string`\>

---

### forceRefresh()

> **forceRefresh**(): `Promise`\<`string`\>

Force token refresh

#### Returns

`Promise`\<`string`\>

---

### setToken()

> **setToken**(`token`, `expiresAt`): `void`

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

Check if token is valid

#### Returns

`boolean`
