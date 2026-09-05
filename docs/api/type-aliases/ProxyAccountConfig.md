[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountConfig

# Type Alias: ProxyAccountConfig

> **ProxyAccountConfig** = `object`

Defined in: [types/proxy.ts:469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L469)

Individual account configuration within a proxy config file.

## Properties

### name

> **name**: `string`

Defined in: [types/proxy.ts:471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L471)

Human-readable name for the account

---

### apiKey

> **apiKey**: `string`

Defined in: [types/proxy.ts:473](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L473)

API key or token (may contain env var references)

---

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: [types/proxy.ts:475](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L475)

Base URL override for the provider endpoint

---

### orgId?

> `optional` **orgId?**: `string`

Defined in: [types/proxy.ts:477](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L477)

Organization ID (e.g., OpenAI orgs)

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/proxy.ts:479](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L479)

Weight for weighted round-robin selection (default: 1)

---

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/proxy.ts:481](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L481)

Whether this account is currently enabled (default: true)

---

### rateLimit?

> `optional` **rateLimit?**: `number`

Defined in: [types/proxy.ts:483](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L483)

Maximum requests per minute for this account

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:485](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L485)

Arbitrary metadata attached to the account
