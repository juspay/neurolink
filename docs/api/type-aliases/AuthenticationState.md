[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthenticationState

# Type Alias: AuthenticationState

> **AuthenticationState** = `object`

Defined in: [types/subscription.ts:638](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L638)

Authentication state for tracking auth status

## Description

Represents the current authentication state

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/subscription.ts:640](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L640)

Whether the user is authenticated

---

### method?

> `optional` **method?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/subscription.ts:642](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L642)

Current authentication method in use

---

### tier?

> `optional` **tier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:644](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L644)

Current subscription tier

---

### needsRefresh

> **needsRefresh**: `boolean`

Defined in: [types/subscription.ts:646](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L646)

Whether tokens need to be refreshed

---

### error?

> `optional` **error?**: `string`

Defined in: [types/subscription.ts:648](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L648)

Error message if authentication failed

---

### lastAuthenticatedAt?

> `optional` **lastAuthenticatedAt?**: `number`

Defined in: [types/subscription.ts:650](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L650)

Timestamp of last successful authentication
