[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuth2TokenManager

# Class: OAuth2TokenManager

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

Get a valid access token

Returns cached token if still valid, otherwise fetches a new one.
Handles concurrent requests by deduplicating token refresh calls.

#### Returns

`Promise`\<`string`\>

---

### invalidate()

> **invalidate**(): `void`

Invalidate the cached token

Call this when the token is rejected by the server to force a refresh.

#### Returns

`void`

---

### isValid()

> **isValid**(): `boolean`

Check if the cached token is valid

#### Returns

`boolean`

---

### getExpiryTime()

> **getExpiryTime**(): `number` \| `null`

Get the token expiry time in milliseconds

#### Returns

`number` \| `null`
