[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthenticationState

# Type Alias: AuthenticationState

> **AuthenticationState** = `object`

Defined in: [types/subscription.ts:636](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L636)

Authentication state for tracking auth status

## Description

Represents the current authentication state

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/subscription.ts:638](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L638)

Whether the user is authenticated

---

### method?

> `optional` **method?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/subscription.ts:640](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L640)

Current authentication method in use

---

### tier?

> `optional` **tier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:642](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L642)

Current subscription tier

---

### needsRefresh

> **needsRefresh**: `boolean`

Defined in: [types/subscription.ts:644](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L644)

Whether tokens need to be refreshed

---

### error?

> `optional` **error?**: `string`

Defined in: [types/subscription.ts:646](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L646)

Error message if authentication failed

---

### lastAuthenticatedAt?

> `optional` **lastAuthenticatedAt?**: `number`

Defined in: [types/subscription.ts:648](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/subscription.ts#L648)

Timestamp of last successful authentication
