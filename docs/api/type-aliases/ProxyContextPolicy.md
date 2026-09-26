[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyContextPolicy

# Type Alias: ProxyContextPolicy

> **ProxyContextPolicy** = `object`

Explicit proxy context controls; all token quantities remain estimates.

## Properties

### maxInputTokens?

> `optional` **maxInputTokens?**: `number`

---

### outputReserveTokens?

> `optional` **outputReserveTokens?**: `number`

---

### enforceDiscoveredLimits?

> `optional` **enforceDiscoveredLimits?**: `boolean`

---

### toolAllowlist?

> `optional` **toolAllowlist?**: `string`[]

---

### models?

> `optional` **models?**: `Record`\<`string`, \{ `contextWindow`: `number`; `maxOutputTokens?`: `number`; `compactAtTokens?`: `number`; `compactToTokens?`: `number`; \}\>
