[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTranslationPlan

# Type Alias: ProxyTranslationPlan

> **ProxyTranslationPlan** = `object`

Defined in: [types/proxy.ts:1616](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1616)

Ordered plan of provider attempts for a proxy request.

## Properties

### requestedModel

> **requestedModel**: `string`

Defined in: [types/proxy.ts:1617](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1617)

---

### modelTier

> **modelTier**: [`ClaudeProxyModelTier`](ClaudeProxyModelTier.md)

Defined in: [types/proxy.ts:1618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1618)

---

### attempts

> **attempts**: [`ProxyTranslationAttempt`](ProxyTranslationAttempt.md)[]

Defined in: [types/proxy.ts:1619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1619)

---

### skipped

> **skipped**: `never`[]

Defined in: [types/proxy.ts:1620](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1620)
