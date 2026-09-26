[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / isTokenExpired

# Function: isTokenExpired()

> **isTokenExpired**(`tokens`, `bufferSeconds?`): `boolean`

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
