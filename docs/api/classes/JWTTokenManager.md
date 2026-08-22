[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / JWTTokenManager

# Class: JWTTokenManager

Defined in: [client/auth.ts:198](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L198)

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

Defined in: [client/auth.ts:204](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L204)

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

Defined in: [client/auth.ts:220](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L220)

Get a valid access token

#### Returns

`Promise`\<`string`\>

---

### forceRefresh()

> **forceRefresh**(): `Promise`\<`string`\>

Defined in: [client/auth.ts:240](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L240)

Force token refresh

#### Returns

`Promise`\<`string`\>

---

### setToken()

> **setToken**(`token`, `expiresAt`): `void`

Defined in: [client/auth.ts:252](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L252)

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

Defined in: [client/auth.ts:260](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L260)

Check if token is valid

#### Returns

`boolean`
