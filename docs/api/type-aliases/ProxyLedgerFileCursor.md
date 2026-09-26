[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerFileCursor

# Type Alias: ProxyLedgerFileCursor

> **ProxyLedgerFileCursor** = `object`

Defined in: [types/proxyClient.ts:293](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L293)

Incremental read position and accumulated entries for one request-log file.

## Properties

### offset

> **offset**: `number`

Defined in: [types/proxyClient.ts:295](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L295)

Byte offset just past the last complete line consumed.

---

### size

> **size**: `number`

Defined in: [types/proxyClient.ts:296](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L296)

---

### entries

> **entries**: `Map`\<`string`, [`ProxyLedgerEntry`](ProxyLedgerEntry.md)\>

Defined in: [types/proxyClient.ts:298](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L298)

requestId -> latest known entry, so a re-logged request cannot double count.
