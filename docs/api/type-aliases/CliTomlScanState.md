[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliTomlScanState

# Type Alias: CliTomlScanState

> **CliTomlScanState** = `object`

What a line of TOML leaves open for the next one: a multi-line string, or
brackets of an array or inline table. A `[` that starts a line is a table
header only when neither is open.

## Properties

### multiline

> **multiline**: "\"\"\"" \| `"'''"` \| `null`

---

### depth

> **depth**: `number`
