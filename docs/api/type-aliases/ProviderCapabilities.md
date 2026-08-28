[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Defined in: [types/providers.ts:479](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L479)

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/providers.ts:480](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L480)

---

### supportsTools

> **supportsTools**: `boolean`

Defined in: [types/providers.ts:481](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L481)

---

### supportsImages

> **supportsImages**: `boolean`

Defined in: [types/providers.ts:482](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L482)

---

### supportsAudio

> **supportsAudio**: `boolean`

Defined in: [types/providers.ts:483](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L483)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:484](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L484)

---

### supportedModels

> **supportedModels**: `string`[]

Defined in: [types/providers.ts:485](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L485)

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Defined in: [types/providers.ts:490](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L490)

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

Defined in: [types/providers.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L495)

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
