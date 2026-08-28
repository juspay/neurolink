[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / IndividualProviderConfig

# Type Alias: IndividualProviderConfig

> **IndividualProviderConfig** = `object`

Defined in: [types/providers.ts:509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L509)

Provider configuration for individual providers

## Indexable

> \[`key`: `string`\]: `unknown`

## Properties

### apiKey?

> `optional` **apiKey?**: `string`

Defined in: [types/providers.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L510)

---

### baseURL?

> `optional` **baseURL?**: `string`

Defined in: [types/providers.ts:511](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L511)

---

### timeout?

> `optional` **timeout?**: `number`

Defined in: [types/providers.ts:512](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L512)

---

### retries?

> `optional` **retries?**: `number`

Defined in: [types/providers.ts:513](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L513)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:514](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L514)

---

### subscriptionTier?

> `optional` **subscriptionTier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/providers.ts:519](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L519)

The subscription tier for the provider (e.g., Claude Pro, Max, Team, Enterprise)
Used to determine rate limits, available features, and pricing

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:524](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L524)

The authentication method to use for the provider
Supports API key, OAuth, session token, or environment variable

---

### authConfig?

> `optional` **authConfig?**: [`AnthropicAuthConfig`](AnthropicAuthConfig.md)

Defined in: [types/providers.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L528)

Detailed authentication configuration including credentials and options

---

### enableBetaFeatures?

> `optional` **enableBetaFeatures?**: `boolean`

Defined in: [types/providers.ts:533](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L533)

Whether to enable beta features for the provider
Beta features may be unstable or subject to change
