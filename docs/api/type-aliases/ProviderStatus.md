[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderStatus

# Type Alias: ProviderStatus

> **ProviderStatus** = `object`

Defined in: [types/providers.ts:120](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L120)

Provider status information

## Properties

### provider

> **provider**: `string`

Defined in: [types/providers.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L121)

---

### status

> **status**: `"working"` \| `"failed"` \| `"not-configured"`

Defined in: [types/providers.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L122)

---

### configured

> **configured**: `boolean`

Defined in: [types/providers.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L123)

---

### authenticated

> **authenticated**: `boolean`

Defined in: [types/providers.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L124)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L125)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/providers.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L126)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L127)

---

### subscription?

> `optional` **subscription?**: [`SubscriptionInfo`](SubscriptionInfo.md)

Defined in: [types/providers.ts:132](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L132)

Subscription information for providers that support subscription tiers
(e.g., Anthropic Claude with Pro/Max/Team/Enterprise subscriptions)

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L136)

The authentication method currently in use for this provider
