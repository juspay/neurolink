[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderStatus

# Type Alias: ProviderStatus

> **ProviderStatus** = `object`

Defined in: [types/providers.ts:121](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L121)

Provider status information

## Properties

### provider

> **provider**: `string`

Defined in: [types/providers.ts:122](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L122)

---

### status

> **status**: `"working"` \| `"failed"` \| `"not-configured"`

Defined in: [types/providers.ts:123](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L123)

---

### configured

> **configured**: `boolean`

Defined in: [types/providers.ts:124](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L124)

---

### authenticated

> **authenticated**: `boolean`

Defined in: [types/providers.ts:125](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L125)

---

### error?

> `optional` **error?**: `string`

Defined in: [types/providers.ts:126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L126)

---

### responseTime?

> `optional` **responseTime?**: `number`

Defined in: [types/providers.ts:127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L127)

---

### model?

> `optional` **model?**: `string`

Defined in: [types/providers.ts:128](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L128)

---

### subscription?

> `optional` **subscription?**: [`SubscriptionInfo`](SubscriptionInfo.md)

Defined in: [types/providers.ts:133](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L133)

Subscription information for providers that support subscription tiers
(e.g., Anthropic Claude with Pro/Max/Team/Enterprise subscriptions)

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

Defined in: [types/providers.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L137)

The authentication method currently in use for this provider
