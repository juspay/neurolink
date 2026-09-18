[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:1870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1870)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:1871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1871)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1872)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:1873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1873)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:1874](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1874)
