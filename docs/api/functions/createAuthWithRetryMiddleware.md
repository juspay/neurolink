[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / createAuthWithRetryMiddleware

# Function: createAuthWithRetryMiddleware()

> **createAuthWithRetryMiddleware**(`tokenManager`, `maxRetries?`): [`ClientMiddleware`](../type-aliases/ClientMiddleware.md)

Defined in: [client/auth.ts:349](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/client/auth.ts#L349)

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
