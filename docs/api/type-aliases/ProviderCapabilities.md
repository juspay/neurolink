[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Defined in: [types/providers.ts:525](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L525)

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/providers.ts:526](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L526)

---

### supportsTools

> **supportsTools**: `boolean`

Defined in: [types/providers.ts:527](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L527)

---

### supportsImages

> **supportsImages**: `boolean`

Defined in: [types/providers.ts:528](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L528)

---

### supportsAudio

> **supportsAudio**: `boolean`

Defined in: [types/providers.ts:529](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L529)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:530](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L530)

---

### supportedModels

> **supportedModels**: `string`[]

Defined in: [types/providers.ts:531](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L531)

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Defined in: [types/providers.ts:536](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L536)

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

Defined in: [types/providers.ts:541](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L541)

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
