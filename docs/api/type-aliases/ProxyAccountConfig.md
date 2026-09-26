[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountConfig

# Type Alias: ProxyAccountConfig

> **ProxyAccountConfig** = `object`

Individual account configuration within a proxy config file.

## Properties

### name

> **name**: `string`

Human-readable name for the account

---

### apiKey

> **apiKey**: `string`

API key or token (may contain env var references)

---

### baseUrl?

> `optional` **baseUrl?**: `string`

Base URL override for the provider endpoint

---

### orgId?

> `optional` **orgId?**: `string`

Organization ID (e.g., OpenAI orgs)

---

### weight?

> `optional` **weight?**: `number`

Weight for weighted round-robin selection (default: 1)

---

### enabled?

> `optional` **enabled?**: `boolean`

Whether this account is currently enabled (default: true)

---

### rateLimit?

> `optional` **rateLimit?**: `number`

Maximum requests per minute for this account

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Arbitrary metadata attached to the account
