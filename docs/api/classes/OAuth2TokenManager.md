[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuth2TokenManager

# Class: OAuth2TokenManager

Defined in: [client/auth.ts:46](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L46)

OAuth2 Token Manager for client credentials flow

Handles token acquisition, caching, and automatic refresh for OAuth2
client credentials authentication.

## Example

```typescript
const tokenManager = new OAuth2TokenManager({
  tokenUrl: "https://auth.example.com/oauth/token",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  scope: "api:read api:write",
});

// Get token (automatically refreshes if needed)
const token = await tokenManager.getToken();

// Use with client
const client = createClient({
  baseUrl: "https://api.example.com",
});
client.use(createDynamicAuthInterceptor(() => tokenManager.getToken()));
```

## Constructors

### Constructor

> **new OAuth2TokenManager**(`config`, `options?`): `OAuth2TokenManager`

Defined in: [client/auth.ts:52](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L52)

#### Parameters

##### config

[`ClientOAuth2Config`](../type-aliases/ClientOAuth2Config.md)

##### options?

###### refreshBufferMs?

`number`

#### Returns

`OAuth2TokenManager`

## Methods

### getToken()

> **getToken**(): `Promise`\<`string`\>

Defined in: [client/auth.ts:65](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L65)

Get a valid access token

Returns cached token if still valid, otherwise fetches a new one.
Handles concurrent requests by deduplicating token refresh calls.

#### Returns

`Promise`\<`string`\>

---

### invalidate()

> **invalidate**(): `void`

Defined in: [client/auth.ts:94](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L94)

Invalidate the cached token

Call this when the token is rejected by the server to force a refresh.

#### Returns

`void`

---

### isValid()

> **isValid**(): `boolean`

Defined in: [client/auth.ts:102](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L102)

Check if the cached token is valid

#### Returns

`boolean`

---

### getExpiryTime()

> **getExpiryTime**(): `number` \| `null`

Defined in: [client/auth.ts:113](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L113)

Get the token expiry time in milliseconds

#### Returns

`number` \| `null`
