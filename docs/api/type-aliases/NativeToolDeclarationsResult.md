[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / NativeToolDeclarationsResult

# Type Alias: NativeToolDeclarationsResult

> **NativeToolDeclarationsResult** = `object`

Return value of buildNativeToolDeclarations.

`originalNameMap` lets callers translate a Google-safe (sanitized,
suffix-disambiguated) tool name back to the original identifier the
SDK consumer registered. Sanitized names are transport-only — they
MUST be hidden from tool-call metadata exposed to consumers.

## Properties

### toolsConfig

> **toolsConfig**: [`NativeToolsConfig`](NativeToolsConfig.md)

---

### executeMap

> **executeMap**: `Map`\<`string`, [`Tool`](Tool.md)\[`"execute"`\]\>

---

### originalNameMap

> **originalNameMap**: `Map`\<`string`, `string`\>
