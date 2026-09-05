[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1659)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1660)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1661)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:1662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1662)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:1663](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1663)
