[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Defined in: [types/providers.ts:486](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L486)

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/providers.ts:487](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L487)

---

### supportsTools

> **supportsTools**: `boolean`

Defined in: [types/providers.ts:488](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L488)

---

### supportsImages

> **supportsImages**: `boolean`

Defined in: [types/providers.ts:489](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L489)

---

### supportsAudio

> **supportsAudio**: `boolean`

Defined in: [types/providers.ts:490](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L490)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L491)

---

### supportedModels

> **supportedModels**: `string`[]

Defined in: [types/providers.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L492)

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Defined in: [types/providers.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L497)

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

Defined in: [types/providers.ts:502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L502)

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
