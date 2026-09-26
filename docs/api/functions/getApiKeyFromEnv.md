[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / getApiKeyFromEnv

# Function: getApiKeyFromEnv()

> **getApiKeyFromEnv**(`envVar`, `options?`): `string` \| `undefined`

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
