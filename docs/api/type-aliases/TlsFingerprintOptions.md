[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TlsFingerprintOptions

# Type Alias: TlsFingerprintOptions

> **TlsFingerprintOptions** = `object`

Defined in: [types/proxy.ts:429](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L429)

Options for the TlsFingerprint cloaking plugin.

## Properties

### profile?

> `optional` **profile?**: `string`

Defined in: [types/proxy.ts:431](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L431)

Target fingerprint profile (e.g. "chrome-131", "node-22", "claude-code").

---

### warnOnUse?

> `optional` **warnOnUse?**: `boolean`

Defined in: [types/proxy.ts:433](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L433)

Whether the stub should log a warning that it is a no-op.
