[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:1638](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1638)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:1639](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1639)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:1640](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1640)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:1641](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1641)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:1642](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1642)
