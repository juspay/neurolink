[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyConfigDoc

# Type Alias: CliProxyConfigDoc

> **CliProxyConfigDoc** = `object`

Defined in: [types/proxy.ts:3493](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3493)

Snapshot of a parsed proxy config file used by CLI primary-account
read/edit/write helpers. Tracks the original format and whether comments
were present (so the CLI can warn that comments will not round-trip).

## Properties

### data

> **data**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:3494](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3494)

---

### format

> **format**: `"yaml"` \| `"json"`

Defined in: [types/proxy.ts:3495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3495)

---

### hadComments

> **hadComments**: `boolean`

Defined in: [types/proxy.ts:3496](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3496)
