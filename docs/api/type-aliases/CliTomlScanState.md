[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliTomlScanState

# Type Alias: CliTomlScanState

> **CliTomlScanState** = `object`

Defined in: [types/proxyClient.ts:146](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L146)

What a line of TOML leaves open for the next one: a multi-line string, or
brackets of an array or inline table. A `[` that starts a line is a table
header only when neither is open.

## Properties

### multiline

> **multiline**: "\"\"\"" \| `"'''"` \| `null`

Defined in: [types/proxyClient.ts:147](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L147)

---

### depth

> **depth**: `number`

Defined in: [types/proxyClient.ts:148](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L148)
