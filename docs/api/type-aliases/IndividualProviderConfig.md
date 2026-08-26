[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L506)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L507)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L508)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L509)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L510)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:511](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L511)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:516](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L516)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:521](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L521)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L525)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:530](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L530)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
