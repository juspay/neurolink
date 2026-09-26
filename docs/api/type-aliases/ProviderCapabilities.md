[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderCapabilities

# Type Alias: ProviderCapabilities

> **ProviderCapabilities** = `object`

Provider capabilities

## Properties

### supportsStreaming

> **supportsStreaming**: `boolean`

---

### supportsTools

> **supportsTools**: `boolean`

---

### supportsImages

> **supportsImages**: `boolean`

---

### supportsAudio

> **supportsAudio**: `boolean`

---

### maxTokens?

> `optional` **maxTokens?**: `number`

---

### supportedModels

> **supportedModels**: `string`[]

---

### subscriptionAware?

> `optional` **subscriptionAware?**: `boolean`

Whether the provider supports subscription-based features and tier management
When true, the provider can adapt behavior based on subscription tier

---

### supportedAuthMethods?

> `optional` **supportedAuthMethods?**: `string`[]

List of authentication methods supported by this provider
e.g., ["api_key", "oauth", "session_token", "environment"]
