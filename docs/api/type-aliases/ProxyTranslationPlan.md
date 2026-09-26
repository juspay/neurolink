[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:2092](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2092)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:2093](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2093)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:2094](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2094)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:2095](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2095)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:2096](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2096)
