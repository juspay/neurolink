[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / OAuthConfig

# Type Alias: OAuthConfig

> **OAuthConfig** = `object`

OAuth configuration for Claude subscription authentication

## Description

Configuration for OAuth 2.0 authentication flow with Claude/Anthropic.
Used to configure the OAuth client for subscription-based access.

## Properties

### clientId

> **clientId**: `string`

OAuth client ID for the application

#### Description

Obtained from Anthropic developer console

---

### redirectUri

> **redirectUri**: `string`

OAuth redirect URI for the callback

#### Description

Must match the registered redirect URI in Anthropic console

---

### scopes

> **scopes**: `string`[]

OAuth scopes to request

#### Description

Array of scope strings defining requested permissions

---

### clientSecret?

> `optional` **clientSecret?**: `string`

OAuth client secret (optional, for confidential clients)

#### Description

Only used for server-side OAuth flows

---

### authorizationEndpoint?

> `optional` **authorizationEndpoint?**: `string`

OAuth authorization endpoint URL

#### Description

Anthropic's OAuth authorization URL

---

### tokenEndpoint?

> `optional` **tokenEndpoint?**: `string`

OAuth token endpoint URL

#### Description

Anthropic's OAuth token exchange URL

---

### codeVerifier?

> `optional` **codeVerifier?**: `string`

PKCE code verifier (for public clients)

#### Description

Used with PKCE flow for enhanced security

---

### state?

> `optional` **state?**: `string`

State parameter for CSRF protection

#### Description

Random string to prevent CSRF attacks
