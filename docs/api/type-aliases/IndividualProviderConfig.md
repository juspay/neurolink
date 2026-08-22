[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:505](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L505)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L506)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L507)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L508)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L509)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L510)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:515](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L515)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:520](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L520)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:524](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L524)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:529](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L529)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
