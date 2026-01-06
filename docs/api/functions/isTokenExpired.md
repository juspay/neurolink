[**NeuroLink API Reference v8.32.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / isTokenExpired

# Function: isTokenExpired()

> **isTokenExpired**(`tokens`, `bufferSeconds`): `boolean`

Defined in: [mcp/auth/tokenStorage.ts:146](https://github.com/juspay/neurolink/blob/e2ee0ff27847312a233f21617e325b3d2c69c76c/src/lib/mcp/auth/tokenStorage.ts#L146)

Check if tokens are expired or about to expire

## Parameters

### tokens

[`OAuthTokens`](../type-aliases/OAuthTokens.md)

OAuth tokens to check

### bufferSeconds

`number` = `60`

Buffer time in seconds before expiration (default: 60)

## Returns

`boolean`

True if tokens are expired or will expire within buffer time
