[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:1846](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1846)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:1847](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1847)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:1848](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1848)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:1849](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1849)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:1850](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1850)
