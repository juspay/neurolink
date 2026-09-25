[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:2090](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2090)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:2091](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2091)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:2092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2092)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:2093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2093)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:2094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2094)
