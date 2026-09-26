[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliTomlSection

# Type Alias: CliTomlSection

> **CliTomlSection** = `object`

Defined in: [types/proxyClient.ts:135](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L135)

One header-delimited run of a client's TOML config. `path` is the parsed
header key (`["model", "gemini-2.5-pro"]` for `[model."gemini-2.5-pro"]`),
or null for the keys before the first header. `lines` keep their own
terminators, so text the writer does not own round-trips byte for byte.

## Properties

### path

> **path**: readonly `string`[] \| `null`

Defined in: [types/proxyClient.ts:136](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L136)

---

### arrayTable

> **arrayTable**: `boolean`

Defined in: [types/proxyClient.ts:137](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L137)

---

### lines

> **lines**: readonly `string`[]

Defined in: [types/proxyClient.ts:138](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L138)
