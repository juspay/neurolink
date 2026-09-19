[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L555)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:556](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L556)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L557)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:558](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L558)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:559](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L559)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:560](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L560)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:565](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L565)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:570](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L570)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:574](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L574)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:579](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L579)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
