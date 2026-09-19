[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyContextPolicy

# Type Alias: ProxyContextPolicy

> **ProxyContextPolicy** = `object`

Defined in: [types/proxyContext.ts:2](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L2)

Explicit proxy context controls; all token quantities remain estimates.

## Properties

### maxInputTokens?

> `optional` **maxInputTokens?**: `number`

Defined in: [types/proxyContext.ts:3](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L3)

---

### outputReserveTokens?

> `optional` **outputReserveTokens?**: `number`

Defined in: [types/proxyContext.ts:4](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L4)

---

### enforceDiscoveredLimits?

> `optional` **enforceDiscoveredLimits?**: `boolean`

Defined in: [types/proxyContext.ts:5](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L5)

---

### toolAllowlist?

> `optional` **toolAllowlist?**: `string`[]

Defined in: [types/proxyContext.ts:6](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L6)

---

### models?

> `optional` **models?**: `Record`\<`string`, \{ `contextWindow`: `number`; `maxOutputTokens?`: `number`; \}\>

Defined in: [types/proxyContext.ts:7](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyContext.ts#L7)
