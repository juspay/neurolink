[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthConfig

# Type Alias: OAuthConfig

> **OAuthConfig** = `object`

Defined in: [types/subscription.ts:605](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L605)

OAuth configuration for Claude subscription authentication

## Description

Configuration for OAuth 2.0 authentication flow with Claude/Anthropic.
Used to configure the OAuth client for subscription-based access.

## Properties

### clientId

> **clientId**: `string`

Defined in: [types/subscription.ts:610](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L610)

OAuth client ID for the application

#### Description

Obtained from Anthropic developer console

---

### redirectUri

> **redirectUri**: `string`

Defined in: [types/subscription.ts:616](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L616)

OAuth redirect URI for the callback

#### Description

Must match the registered redirect URI in Anthropic console

---

### scopes

> **scopes**: `string`[]

Defined in: [types/subscription.ts:622](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L622)

OAuth scopes to request

#### Description

Array of scope strings defining requested permissions

---

### clientSecret?

> `optional` **clientSecret?**: `string`

Defined in: [types/subscription.ts:628](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L628)

OAuth client secret (optional, for confidential clients)

#### Description

Only used for server-side OAuth flows

---

### authorizationEndpoint?

> `optional` **authorizationEndpoint?**: `string`

Defined in: [types/subscription.ts:634](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L634)

OAuth authorization endpoint URL

#### Description

Anthropic's OAuth authorization URL

---

### tokenEndpoint?

> `optional` **tokenEndpoint?**: `string`

Defined in: [types/subscription.ts:640](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L640)

OAuth token endpoint URL

#### Description

Anthropic's OAuth token exchange URL

---

### codeVerifier?

> `optional` **codeVerifier?**: `string`

Defined in: [types/subscription.ts:646](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L646)

PKCE code verifier (for public clients)

#### Description

Used with PKCE flow for enhanced security

---

### state?

> `optional` **state?**: `string`

Defined in: [types/subscription.ts:652](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L652)

State parameter for CSRF protection

#### Description

Random string to prevent CSRF attacks
