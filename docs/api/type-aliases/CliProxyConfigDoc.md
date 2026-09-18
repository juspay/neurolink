[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyConfigDoc

# Type Alias: CliProxyConfigDoc

> **CliProxyConfigDoc** = `object`

Defined in: [types/proxy.ts:3266](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3266)

Snapshot of a parsed proxy config file used by CLI primary-account
read/edit/write helpers. Tracks the original format and whether comments
were present (so the CLI can warn that comments will not round-trip).

## Properties

### data

> **data**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:3267](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3267)

---

### format

> **format**: `"yaml"` \| `"json"`

Defined in: [types/proxy.ts:3268](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3268)

---

### hadComments

> **hadComments**: `boolean`

Defined in: [types/proxy.ts:3269](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3269)
