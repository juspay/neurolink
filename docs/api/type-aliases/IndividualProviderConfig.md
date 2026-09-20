[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:554](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L554)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:555](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L555)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:556](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L556)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:557](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L557)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:558](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L558)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:559](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L559)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:564](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L564)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:569](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L569)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:573](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L573)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:578](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L578)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
