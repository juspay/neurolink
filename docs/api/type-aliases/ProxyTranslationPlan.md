[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:2002](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2002)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:2003](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2003)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:2004](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2004)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:2005](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2005)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:2006](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2006)
