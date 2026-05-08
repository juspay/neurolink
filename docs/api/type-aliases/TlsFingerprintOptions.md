[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TlsFingerprintOptions

# Type Alias: TlsFingerprintOptions

> **TlsFingerprintOptions** = `object`

Defined in: [types/proxy.ts:417](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L417)

Options for the TlsFingerprint cloaking plugin.

## Properties

### profile?

> `optional` **profile?**: `string`

Defined in: [types/proxy.ts:419](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L419)

Target fingerprint profile (e.g. "chrome-131", "node-22", "claude-code").

---

### warnOnUse?

> `optional` **warnOnUse?**: `boolean`

Defined in: [types/proxy.ts:421](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/proxy.ts#L421)

Whether the stub should log a warning that it is a no-op.
