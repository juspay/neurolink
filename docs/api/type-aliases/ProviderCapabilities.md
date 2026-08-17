[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Defined in: [types/providers.ts:501](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L501)

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

Defined in: [types/providers.ts:502](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L502)

---

### supportsTools

> **supportsTools**: `boolean`

Defined in: [types/providers.ts:503](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L503)

---

### supportsImages

> **supportsImages**: `boolean`

Defined in: [types/providers.ts:504](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L504)

---

### supportsAudio

> **supportsAudio**: `boolean`

Defined in: [types/providers.ts:505](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L505)

---

### maxTokens?

> `optional` **maxTokens?**: `number`

Defined in: [types/providers.ts:506](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L506)

---

### supportedModels

> **supportedModels**: `string`[]

Defined in: [types/providers.ts:507](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L507)

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Defined in: [types/providers.ts:512](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L512)

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

Defined in: [types/providers.ts:517](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L517)

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
