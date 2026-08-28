[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeToolDeclarationsResult

# Type Alias: NativeToolDeclarationsResult

> **NativeToolDeclarationsResult** = `object`

Defined in: [types/providers.ts:2033](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2033)

Return value of buildNativeToolDeclarations.

`originalNameMap` lets callers translate a Google-safe (sanitized,
suffix-disambiguated) tool name back to the original identifier the
SDK consumer registered. Sanitized names are transport-only — they
MUST be hidden from tool-call metadata exposed to consumers.

## Properties

### toolsConfig

> **toolsConfig**: [`NativeToolsConfig`](NativeToolsConfig.md)

Defined in: [types/providers.ts:2034](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2034)

---

### executeMap

> **executeMap**: `Map`\<`string`, `Tool`\[`"execute"`\]\>

Defined in: [types/providers.ts:2035](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2035)

---

### originalNameMap

> **originalNameMap**: `Map`\<`string`, `string`\>

Defined in: [types/providers.ts:2036](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2036)
