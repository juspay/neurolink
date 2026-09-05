[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / TlsFingerprintOptions

# Type Alias: TlsFingerprintOptions

> **TlsFingerprintOptions** = `object`

Defined in: [types/proxy.ts:435](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L435)

Options for the TlsFingerprint cloaking plugin.

## Properties

### profile?

> `optional` **profile?**: `string`

Defined in: [types/proxy.ts:437](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L437)

Target fingerprint profile (e.g. "chrome-131", "node-22", "claude-code").

---

### warnOnUse?

> `optional` **warnOnUse?**: `boolean`

Defined in: [types/proxy.ts:439](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L439)

Whether the stub should log a warning that it is a no-op.
