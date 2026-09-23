[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountConfig

# Type Alias: ProxyAccountConfig

> **ProxyAccountConfig** = `object`

Defined in: [types/proxy.ts:481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L481)

Individual account configuration within a proxy config file.

## Properties

### name

> **name**: `string`

Defined in: [types/proxy.ts:483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L483)

Human-readable name for the account

---

### apiKey

> **apiKey**: `string`

Defined in: [types/proxy.ts:485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L485)

API key or token (may contain env var references)

---

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: [types/proxy.ts:487](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L487)

Base URL override for the provider endpoint

---

### orgId?

> `optional` **orgId?**: `string`

Defined in: [types/proxy.ts:489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L489)

Organization ID (e.g., OpenAI orgs)

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/proxy.ts:491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L491)

Weight for weighted round-robin selection (default: 1)

---

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/proxy.ts:493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L493)

Whether this account is currently enabled (default: true)

---

### rateLimit?

> `optional` **rateLimit?**: `number`

Defined in: [types/proxy.ts:495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L495)

Maximum requests per minute for this account

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L497)

Arbitrary metadata attached to the account
