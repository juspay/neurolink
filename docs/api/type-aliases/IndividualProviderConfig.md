[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:515](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L515)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:516](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L516)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:517](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L517)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:518](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L518)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:519](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L519)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:520](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L520)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L525)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:530](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L530)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:534](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L534)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:539](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L539)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
