[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthenticationState

# Type Alias: AuthenticationState

> **AuthenticationState** = `object`

Defined in: [types/subscription.ts:637](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L637)

Authentication state for tracking auth status

## Description

Represents the current authentication state

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/subscription.ts:639](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L639)

Whether the user is authenticated

---

### method?

> `optional` **method?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/subscription.ts:641](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L641)

Current authentication method in use

---

### tier?

> `optional` **tier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:643](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L643)

Current subscription tier

---

### needsRefresh

> **needsRefresh**: `boolean`

Defined in: [types/subscription.ts:645](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L645)

Whether tokens need to be refreshed

---

### error?

> `optional` **error?**: `string`

Defined in: [types/subscription.ts:647](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L647)

Error message if authentication failed

---

### lastAuthenticatedAt?

> `optional` **lastAuthenticatedAt?**: `number`

Defined in: [types/subscription.ts:649](https://github.com/juspay/neurolink/blob/release/src/lib/types/subscription.ts#L649)

Timestamp of last successful authentication
