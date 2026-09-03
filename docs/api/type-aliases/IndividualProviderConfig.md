[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:514](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L514)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:515](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L515)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:516](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L516)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:517](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L517)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:518](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L518)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:519](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L519)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:524](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L524)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:529](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L529)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L533)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:538](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L538)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
