[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthWithRetryMiddleware

# Function: createAuthWithRetryMiddleware()

> **createAuthWithRetryMiddleware**(`tokenManager`, `maxRetries?`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:352](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L352)

Create an authentication middleware with retry on 401

Automatically refreshes token and retries request when receiving 401.

## Parameters

### tokenManager

[`OAuth2TokenManager`](../classes/OAuth2TokenManager.md)

### maxRetries?

`number` = `1`

## Returns

[`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

## Example

```typescript
const tokenManager = new OAuth2TokenManager({...});

const client = createClient({ baseUrl: 'https://api.example.com' });
client.use(createAuthWithRetryMiddleware(tokenManager));
```
