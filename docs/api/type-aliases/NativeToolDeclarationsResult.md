[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeToolDeclarationsResult

# Type Alias: NativeToolDeclarationsResult

> **NativeToolDeclarationsResult** = `object`

Defined in: [types/providers.ts:2068](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2068)

Return value of buildNativeToolDeclarations.

`originalNameMap` lets callers translate a Google-safe (sanitized,
suffix-disambiguated) tool name back to the original identifier the
SDK consumer registered. Sanitized names are transport-only — they
MUST be hidden from tool-call metadata exposed to consumers.

## Properties

### toolsConfig

> **toolsConfig**: [`NativeToolsConfig`](NativeToolsConfig.md)

Defined in: [types/providers.ts:2069](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2069)

---

### executeMap

> **executeMap**: `Map`\<`string`, `Tool`\[`"execute"`\]\>

Defined in: [types/providers.ts:2070](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2070)

---

### originalNameMap

> **originalNameMap**: `Map`\<`string`, `string`\>

Defined in: [types/providers.ts:2071](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2071)
