[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / AuthenticationState

# Type Alias: AuthenticationState

> **AuthenticationState** = `object`

Defined in: [types/subscription.ts:554](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L554)

Authentication state for tracking auth status

## Description

Represents the current authentication state

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [types/subscription.ts:556](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L556)

Whether the user is authenticated

---

### method?

> `optional` **method?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/subscription.ts:558](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L558)

Current authentication method in use

---

### tier?

> `optional` **tier?**: [`ClaudeSubscriptionTier`](ClaudeSubscriptionTier.md)

Defined in: [types/subscription.ts:560](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L560)

Current subscription tier

---

### needsRefresh

> **needsRefresh**: `boolean`

Defined in: [types/subscription.ts:562](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L562)

Whether tokens need to be refreshed

---

### error?

> `optional` **error?**: `string`

Defined in: [types/subscription.ts:564](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L564)

Error message if authentication failed

---

### lastAuthenticatedAt?

> `optional` **lastAuthenticatedAt?**: `number`

Defined in: [types/subscription.ts:566](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/subscription.ts#L566)

Timestamp of last successful authentication
