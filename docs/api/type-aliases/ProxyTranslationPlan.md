[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:2025](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2025)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:2026](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2026)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:2027](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2027)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:2028](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2028)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:2029](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2029)
