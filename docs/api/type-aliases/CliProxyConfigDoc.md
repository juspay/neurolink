[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyConfigDoc

# Type Alias: CliProxyConfigDoc

> **CliProxyConfigDoc** = `object`

Defined in: [types/proxy.ts:3516](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3516)

Snapshot of a parsed proxy config file used by CLI primary-account
read/edit/write helpers. Tracks the original format and whether comments
were present (so the CLI can warn that comments will not round-trip).

## Properties

### data

> **data**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:3517](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3517)

---

### format

> **format**: `"yaml"` \| `"json"`

Defined in: [types/proxy.ts:3518](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3518)

---

### hadComments

> **hadComments**: `boolean`

Defined in: [types/proxy.ts:3519](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3519)
