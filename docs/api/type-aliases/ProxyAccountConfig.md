[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyAccountConfig

# Type Alias: ProxyAccountConfig

> **ProxyAccountConfig** = `object`

Defined in: [types/proxy.ts:451](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L451)

Individual account configuration within a proxy config file.

## Properties

### name

> **name**: `string`

Defined in: [types/proxy.ts:453](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L453)

Human-readable name for the account

---

### apiKey

> **apiKey**: `string`

Defined in: [types/proxy.ts:455](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L455)

API key or token (may contain env var references)

---

### baseUrl?

> `optional` **baseUrl?**: `string`

Defined in: [types/proxy.ts:457](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L457)

Base URL override for the provider endpoint

---

### orgId?

> `optional` **orgId?**: `string`

Defined in: [types/proxy.ts:459](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L459)

Organization ID (e.g., OpenAI orgs)

---

### weight?

> `optional` **weight?**: `number`

Defined in: [types/proxy.ts:461](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L461)

Weight for weighted round-robin selection (default: 1)

---

### enabled?

> `optional` **enabled?**: `boolean`

Defined in: [types/proxy.ts:463](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L463)

Whether this account is currently enabled (default: true)

---

### rateLimit?

> `optional` **rateLimit?**: `number`

Defined in: [types/proxy.ts:465](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L465)

Maximum requests per minute for this account

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:467](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L467)

Arbitrary metadata attached to the account
