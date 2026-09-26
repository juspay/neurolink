[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:571](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L571)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:572](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L572)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:573](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L573)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L574)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:575](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L575)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:576](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L576)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:581](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L581)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:586](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L586)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:590](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L590)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:595](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L595)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
