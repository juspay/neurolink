[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Defined in: [types/providers.ts:476](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L476)

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/providers.ts:477](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L477)

---

### supportsTools

> **supportsTools**: `boolean`

Defined in: [types/providers.ts:478](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L478)

---

### supportsImages

> **supportsImages**: `boolean`

Defined in: [types/providers.ts:479](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L479)

---

### supportsAudio

> **supportsAudio**: `boolean`

Defined in: [types/providers.ts:480](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L480)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:481](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L481)

---

### supportedModels

> **supportedModels**: `string`[]

Defined in: [types/providers.ts:482](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L482)

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Defined in: [types/providers.ts:487](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L487)

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

Defined in: [types/providers.ts:492](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L492)

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
