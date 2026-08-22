[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getApiKeyFromEnv

# Function: getApiKeyFromEnv()

> **getApiKeyFromEnv**(`envVar`, `options?`): `string` \| `undefined`

Defined in: [client/auth.ts:551](https://github.com/juspay/neurolink/blob/release/src/lib/client/auth.ts#L551)

Create an API key from environment variable with validation

## Parameters

### envVar

`string`

### options?

#### required?

`boolean`

## Returns

`string` \| `undefined`

## Example

```typescript
const apiKey = getApiKeyFromEnv("NEUROLINK_API_KEY");
const client = createClient({
  baseUrl: "https://api.example.com",
  apiKey,
});
```
