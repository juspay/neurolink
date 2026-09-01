[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Defined in: [types/providers.ts:496](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L496)

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/providers.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L497)

---

### supportsTools

> **supportsTools**: `boolean`

Defined in: [types/providers.ts:498](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L498)

---

### supportsImages

> **supportsImages**: `boolean`

Defined in: [types/providers.ts:499](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L499)

---

### supportsAudio

> **supportsAudio**: `boolean`

Defined in: [types/providers.ts:500](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L500)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L501)

---

### supportedModels

> **supportedModels**: `string`[]

Defined in: [types/providers.ts:502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L502)

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Defined in: [types/providers.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L507)

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

Defined in: [types/providers.ts:512](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L512)

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
