[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeToolDeclarationsResult

# Type Alias: NativeToolDeclarationsResult

> **NativeToolDeclarationsResult** = `object`

Defined in: [types/providers.ts:2124](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2124)

Return value of buildNativeToolDeclarations.

`originalNameMap` lets callers translate a Google-safe (sanitized,
suffix-disambiguated) tool name back to the original identifier the
SDK consumer registered. Sanitized names are transport-only — they
MUST be hidden from tool-call metadata exposed to consumers.

## Properties

### toolsConfig

> **toolsConfig**: [`NativeToolsConfig`](NativeToolsConfig.md)

Defined in: [types/providers.ts:2125](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2125)

---

### executeMap

> **executeMap**: `Map`\<`string`, [`Tool`](Tool.md)\[`"execute"`\]\>

Defined in: [types/providers.ts:2126](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2126)

---

### originalNameMap

> **originalNameMap**: `Map`\<`string`, `string`\>

Defined in: [types/providers.ts:2127](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2127)
