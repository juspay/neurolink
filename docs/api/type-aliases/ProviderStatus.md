[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderStatus

# Type Alias: ProviderStatus

> **ProviderStatus** = `object`

Provider status information

## Properties

### provider

> **provider**: `string`

---

### status

> **status**: `"working"` \| `"failed"` \| `"not-configured"`

---

### configured

> **configured**: `boolean`

---

### authenticated

> **authenticated**: `boolean`

---

### error?

> `optional` **error?**: `string`

---

### responseTime?

> `optional` **responseTime?**: `number`

---

### model?

> `optional` **model?**: `string`

---

### subscription?

> `optional` **subscription?**: [`SubscriptionInfo`](SubscriptionInfo.md)

Subscription information for providers that support subscription tiers
(e.g., Anthropic Claude with Pro/Max/Team/Enterprise subscriptions)

---

### authMethod?

> `optional` **authMethod?**: [`AnthropicAuthMethod`](AnthropicAuthMethod.md)

The authentication method currently in use for this provider
