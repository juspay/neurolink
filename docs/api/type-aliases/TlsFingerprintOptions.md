[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TlsFingerprintOptions

# Type Alias: TlsFingerprintOptions

> **TlsFingerprintOptions** = `object`

Defined in: [types/proxy.ts:430](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L430)

Options for the TlsFingerprint cloaking plugin.

## Properties

### profile?

> `optional` **profile?**: `string`

Defined in: [types/proxy.ts:432](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L432)

Target fingerprint profile (e.g. "chrome-131", "node-22", "claude-code").

---

### warnOnUse?

> `optional` **warnOnUse?**: `boolean`

Defined in: [types/proxy.ts:434](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L434)

Whether the stub should log a warning that it is a no-op.
