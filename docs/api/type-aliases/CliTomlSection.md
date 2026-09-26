[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliTomlSection

# Type Alias: CliTomlSection

> **CliTomlSection** = `object`

One header-delimited run of a client's TOML config. `path` is the parsed
header key (`["model", "gemini-2.5-pro"]` for `[model."gemini-2.5-pro"]`),
or null for the keys before the first header. `lines` keep their own
terminators, so text the writer does not own round-trips byte for byte.

## Properties

### path

> **path**: readonly `string`[] \| `null`

---

### arrayTable

> **arrayTable**: `boolean`

---

### lines

> **lines**: readonly `string`[]
