[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyConfig

# Type Alias: ProxyConfig

> **ProxyConfig** = `object`

Full proxy config (loaded from YAML)

## Properties

### host?

> `optional` **host?**: `string`

---

### port?

> `optional` **port?**: `number`

---

### auth?

> `optional` **auth?**: `"none"` \| `"api-key"`

---

### proxyApiKey?

> `optional` **proxyApiKey?**: `string`

---

### accounts?

> `optional` **accounts?**: `Record`\<`string`, `object`[]\>

Provider-keyed account map matching the YAML structure (e.g. accounts.anthropic[0])

---

### routing?

> `optional` **routing?**: `Partial`\<[`ProxyRoutingConfig`](ProxyRoutingConfig.md)\>

---

### cloaking?

> `optional` **cloaking?**: [`CloakingConfig`](CloakingConfig.md)
