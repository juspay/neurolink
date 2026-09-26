[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Defined in: [types/providers.ts:543](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L543)

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/providers.ts:544](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L544)

---

### supportsTools

> **supportsTools**: `boolean`

Defined in: [types/providers.ts:545](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L545)

---

### supportsImages

> **supportsImages**: `boolean`

Defined in: [types/providers.ts:546](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L546)

---

### supportsAudio

> **supportsAudio**: `boolean`

Defined in: [types/providers.ts:547](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L547)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:548](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L548)

---

### supportedModels

> **supportedModels**: `string`[]

Defined in: [types/providers.ts:549](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L549)

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Defined in: [types/providers.ts:554](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L554)

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

Defined in: [types/providers.ts:559](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L559)

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
