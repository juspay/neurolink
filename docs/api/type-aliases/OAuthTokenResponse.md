[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthTokenResponse

# Type Alias: OAuthTokenResponse

> **OAuthTokenResponse** = `object`

Defined in: [types/subscription.ts:953](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L953)

OAuth 2.0 token response from Anthropic (raw API response shape)

## Properties

### access_token

> **access_token**: `string`

Defined in: [types/subscription.ts:955](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L955)

The access token for API authentication

---

### token_type

> **token_type**: `string`

Defined in: [types/subscription.ts:957](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L957)

Token type (typically "Bearer")

---

### expires_in

> **expires_in**: `number`

Defined in: [types/subscription.ts:959](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L959)

Token expiration time in seconds

---

### refresh_token?

> `optional` **refresh_token?**: `string`

Defined in: [types/subscription.ts:961](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L961)

Refresh token for obtaining new access tokens

---

### scope?

> `optional` **scope?**: `string`

Defined in: [types/subscription.ts:963](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L963)

Granted scopes (space-separated)
