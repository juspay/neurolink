[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L570)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:571](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L571)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:572](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L572)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:573](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L573)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L574)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:575](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L575)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:580](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L580)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:585](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L585)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:589](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L589)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:594](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L594)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
