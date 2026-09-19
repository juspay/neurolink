[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Defined in: [types/providers.ts:505](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L505)

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/providers.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L506)

---

### supportsTools

> **supportsTools**: `boolean`

Defined in: [types/providers.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L507)

---

### supportsImages

> **supportsImages**: `boolean`

Defined in: [types/providers.ts:508](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L508)

---

### supportsAudio

> **supportsAudio**: `boolean`

Defined in: [types/providers.ts:509](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L509)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:510](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L510)

---

### supportedModels

> **supportedModels**: `string`[]

Defined in: [types/providers.ts:511](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L511)

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Defined in: [types/providers.ts:516](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L516)

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

Defined in: [types/providers.ts:521](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L521)

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
