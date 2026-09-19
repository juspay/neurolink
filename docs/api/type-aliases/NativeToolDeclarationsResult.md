[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeToolDeclarationsResult

# Type Alias: NativeToolDeclarationsResult

> **NativeToolDeclarationsResult** = `object`

Defined in: [types/providers.ts:2074](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2074)

Return value of buildNativeToolDeclarations.

`originalNameMap` lets callers translate a Google-safe (sanitized,
suffix-disambiguated) tool name back to the original identifier the
SDK consumer registered. Sanitized names are transport-only — they
MUST be hidden from tool-call metadata exposed to consumers.

## Properties

### toolsConfig

> **toolsConfig**: [`NativeToolsConfig`](NativeToolsConfig.md)

Defined in: [types/providers.ts:2075](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2075)

---

### executeMap

> **executeMap**: `Map`\<`string`, [`Tool`](Tool.md)\[`"execute"`\]\>

Defined in: [types/providers.ts:2076](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2076)

---

### originalNameMap

> **originalNameMap**: `Map`\<`string`, `string`\>

Defined in: [types/providers.ts:2077](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2077)
