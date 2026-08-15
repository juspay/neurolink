[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / isTokenExpired

# Function: isTokenExpired()

> **isTokenExpired**(`tokens`, `bufferSeconds?`): `boolean`

Defined in: [mcp/auth/tokenStorage.ts:146](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/mcp/auth/tokenStorage.ts#L146)

Check if tokens are expired or about to expire

## Parameters

### tokens

[`OAuthTokens`](../type-aliases/OAuthTokens.md)

OAuth tokens to check

### bufferSeconds?

`number` = `60`

Buffer time in seconds before expiration (default: 60)

## Returns

`boolean`

True if tokens are expired or will expire within buffer time
