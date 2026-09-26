[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:2114](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2114)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:2115](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2115)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:2116](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2116)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:2117](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2117)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:2118](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2118)
