[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountConfig

# Type Alias: ProxyAccountConfig

> **ProxyAccountConfig** = `object`

Defined in: [types/proxy.ts:464](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L464)

Individual account configuration within a proxy config file.

## Properties

### name

> **name**: `string`

Defined in: [types/proxy.ts:466](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L466)

Human-readable name for the account

---

### apiKey

> **apiKey**: `string`

Defined in: [types/proxy.ts:468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L468)

API key or token (may contain env var references)

---

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: [types/proxy.ts:470](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L470)

Base URL override for the provider endpoint

---

### orgId?

> `optional` **orgId?**: `string`

Defined in: [types/proxy.ts:472](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L472)

Organization ID (e.g., OpenAI orgs)

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/proxy.ts:474](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L474)

Weight for weighted round-robin selection (default: 1)

---

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/proxy.ts:476](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L476)

Whether this account is currently enabled (default: true)

---

### rateLimit?

> `optional` **rateLimit?**: `number`

Defined in: [types/proxy.ts:478](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L478)

Maximum requests per minute for this account

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:480](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L480)

Arbitrary metadata attached to the account
