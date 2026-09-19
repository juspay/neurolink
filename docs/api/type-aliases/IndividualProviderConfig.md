[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:534](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L534)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:535](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L535)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L536)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:537](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L537)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L538)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:539](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L539)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:544](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L544)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:549](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L549)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:553](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L553)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:558](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L558)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
