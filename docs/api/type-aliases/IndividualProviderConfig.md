[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:526](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L526)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:527](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L527)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L528)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:529](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L529)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:530](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L530)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:531](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L531)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L536)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L541)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:545](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L545)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:550](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L550)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
