[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AnthropicProviderConfig

# Type Alias: AnthropicProviderConfig

> **AnthropicProviderConfig** = [`IndividualProviderConfig`](IndividualProviderConfig.md) & `object`

Defined in: [types/providers.ts:543](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L543)

Anthropic-specific provider configuration

## Type Declaration

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

The subscription tier for Claude access

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

The authentication method to use

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Whether to enable beta features

### oauthToken?

> `optional` **oauthToken?**: [`OAuthToken`](OAuthToken.md)

OAuth token for OAuth authentication.
Required when authMethod is "oauth".

### oauthConfig?

> `optional` **oauthConfig?**: `object`

OAuth configuration for OAuth-based authentication

#### oauthConfig.clientId?

> `optional` **clientId?**: `string`

OAuth client ID for the application

#### oauthConfig.redirectUri?

> `optional` **redirectUri?**: `string`

OAuth redirect URI for the callback

#### oauthConfig.scopes?

> `optional` **scopes?**: `string`[]

OAuth scopes to request

#### oauthConfig.authorizationEndpoint?

> `optional` **authorizationEndpoint?**: `string`

OAuth authorization endpoint URL

#### oauthConfig.tokenEndpoint?

> `optional` **tokenEndpoint?**: `string`

OAuth token endpoint URL

## Description

Extends the base provider configuration with Anthropic-specific
options for OAuth, subscription management, and beta features.
