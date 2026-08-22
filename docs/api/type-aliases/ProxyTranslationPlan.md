[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:1549](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1549)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:1550](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1550)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:1551](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1551)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:1552](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1552)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:1553](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1553)
