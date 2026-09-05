[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L533)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:534](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L534)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:535](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L535)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L536)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:537](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L537)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L538)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:543](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L543)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:548](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L548)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:552](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L552)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L557)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
