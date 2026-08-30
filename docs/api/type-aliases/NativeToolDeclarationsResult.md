[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeToolDeclarationsResult

# Type Alias: NativeToolDeclarationsResult

> **NativeToolDeclarationsResult** = `object`

Defined in: [types/providers.ts:2046](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2046)

Return value of buildNativeToolDeclarations.

`originalNameMap` lets callers translate a Google-safe (sanitized,
suffix-disambiguated) tool name back to the original identifier the
SDK consumer registered. Sanitized names are transport-only — they
MUST be hidden from tool-call metadata exposed to consumers.

## Properties

### toolsConfig

> **toolsConfig**: [`NativeToolsConfig`](NativeToolsConfig.md)

Defined in: [types/providers.ts:2047](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2047)

---

### executeMap

> **executeMap**: `Map`\<`string`, `Tool`\[`"execute"`\]\>

Defined in: [types/providers.ts:2048](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2048)

---

### originalNameMap

> **originalNameMap**: `Map`\<`string`, `string`\>

Defined in: [types/providers.ts:2049](https://github.com/juspay/neurolink/blob/release/src/lib/types/providers.ts#L2049)
