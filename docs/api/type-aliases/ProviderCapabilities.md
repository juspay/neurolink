[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Defined in: [types/providers.ts:524](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L524)

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/providers.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L525)

---

### supportsTools

> **supportsTools**: `boolean`

Defined in: [types/providers.ts:526](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L526)

---

### supportsImages

> **supportsImages**: `boolean`

Defined in: [types/providers.ts:527](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L527)

---

### supportsAudio

> **supportsAudio**: `boolean`

Defined in: [types/providers.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L528)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:529](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L529)

---

### supportedModels

> **supportedModels**: `string`[]

Defined in: [types/providers.ts:530](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L530)

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Defined in: [types/providers.ts:535](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L535)

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

Defined in: [types/providers.ts:540](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L540)

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
