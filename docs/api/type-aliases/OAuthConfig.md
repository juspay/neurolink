[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthConfig

# Type Alias: OAuthConfig

> **OAuthConfig** = `object`

Defined in: [types/subscription.ts:687](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L687)

OAuth configuration for Claude subscription authentication

## Description

Configuration for OAuth 2.0 authentication flow with Claude/Anthropic.
Used to configure the OAuth client for subscription-based access.

## Properties

### clientId

> **clientId**: `string`

Defined in: [types/subscription.ts:692](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L692)

OAuth client ID for the application

#### Description

Obtained from Anthropic developer console

---

### redirectUri

> **redirectUri**: `string`

Defined in: [types/subscription.ts:698](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L698)

OAuth redirect URI for the callback

#### Description

Must match the registered redirect URI in Anthropic console

---

### scopes

> **scopes**: `string`[]

Defined in: [types/subscription.ts:704](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L704)

OAuth scopes to request

#### Description

Array of scope strings defining requested permissions

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/subscription.ts:710](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L710)

OAuth client secret (optional, for confidential clients)

#### Description

Only used for server-side OAuth flows

---

### authorizationEndpoint?

> `optional` **authorizationEndpoint?**: `string`

Defined in: [types/subscription.ts:716](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L716)

OAuth authorization endpoint URL

#### Description

Anthropic's OAuth authorization URL

---

### tokenEndpoint?

> `optional` **tokenEndpoint?**: `string`

Defined in: [types/subscription.ts:722](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L722)

OAuth token endpoint URL

#### Description

Anthropic's OAuth token exchange URL

---

### codeVerifier?

> `optional` **codeVerifier?**: `string`

Defined in: [types/subscription.ts:728](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L728)

PKCE code verifier (for public clients)

#### Description

Used with PKCE flow for enhanced security

---

### state?

> `optional` **state?**: `string`

Defined in: [types/subscription.ts:734](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L734)

State parameter for CSRF protection

#### Description

Random string to prevent CSRF attacks
