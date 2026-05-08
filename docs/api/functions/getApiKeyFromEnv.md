[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / getApiKeyFromEnv

# Function: getApiKeyFromEnv()

> **getApiKeyFromEnv**(`envVar`, `options?`): `string` \| `undefined`

Defined in: [client/auth.ts:554](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/client/auth.ts#L554)

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
