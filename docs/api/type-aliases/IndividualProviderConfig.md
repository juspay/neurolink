[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L507)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L508)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L509)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L510)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:511](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L511)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:512](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L512)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:517](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L517)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:522](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L522)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:526](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L526)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:531](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L531)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
