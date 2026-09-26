[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthenticationState

# Type Alias: AuthenticationState

> **AuthenticationState** = `object`

Authentication state for tracking auth status

## Description

Represents the current authentication state

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Whether the user is authenticated

---

### method?

> `optional` **method?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Current authentication method in use

---

### tier?

> `optional` **tier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Current subscription tier

---

### needsRefresh

> **needsRefresh**: `boolean`

Whether tokens need to be refreshed

---

### error?

> `optional` **error?**: `string`

Error message if authentication failed

---

### lastAuthenticatedAt?

> `optional` **lastAuthenticatedAt?**: `number`

Timestamp of last successful authentication
