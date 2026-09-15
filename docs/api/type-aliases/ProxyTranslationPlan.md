[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:1853](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1853)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:1854](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1854)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:1855](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1855)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:1856](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1856)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:1857](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1857)
