[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / CliProxyConfigDoc

# Type Alias: CliProxyConfigDoc

> **CliProxyConfigDoc** = `object`

Defined in: [types/proxy.ts:2801](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2801)

Snapshot of a parsed proxy config file used by CLI primary-account
read/edit/write helpers. Tracks the original format and whether comments
were present (so the CLI can warn that comments will not round-trip).

## Properties

### data

> **data**: `Record`\<`string`, `unknown`\>

Defined in: [types/proxy.ts:2802](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2802)

---

### format

> **format**: `"yaml"` \| `"json"`

Defined in: [types/proxy.ts:2803](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2803)

---

### hadComments

> **hadComments**: `boolean`

Defined in: [types/proxy.ts:2804](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2804)
