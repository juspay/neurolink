[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyConfigDoc

# Type Alias: CliProxyConfigDoc

> **CliProxyConfigDoc** = `object`

Defined in: [types/proxy.ts:3227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3227)

Snapshot of a parsed proxy config file used by CLI primary-account
read/edit/write helpers. Tracks the original format and whether comments
were present (so the CLI can warn that comments will not round-trip).

## Properties

### data

> **data**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:3228](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3228)

---

### format

> **format**: `"yaml"` \| `"json"`

Defined in: [types/proxy.ts:3229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3229)

---

### hadComments

> **hadComments**: `boolean`

Defined in: [types/proxy.ts:3230](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3230)
