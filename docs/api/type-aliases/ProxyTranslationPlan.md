[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1653)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:1654](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1654)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1655)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1656)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:1657](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1657)
