[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerFileCursor

# Type Alias: ProxyLedgerFileCursor

> **ProxyLedgerFileCursor** = `object`

Defined in: [types/proxyClient.ts:206](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L206)

Incremental read position and accumulated entries for one request-log file.

## Properties

### offset

> **offset**: `number`

Defined in: [types/proxyClient.ts:208](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L208)

Byte offset just past the last complete line consumed.

---

### size

> **size**: `number`

Defined in: [types/proxyClient.ts:209](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L209)

---

### entries

> **entries**: `Map`\<`string`, [`ProxyLedgerEntry`](ProxyLedgerEntry.md)\>

Defined in: [types/proxyClient.ts:211](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L211)

requestId -> latest known entry, so a re-logged request cannot double count.
