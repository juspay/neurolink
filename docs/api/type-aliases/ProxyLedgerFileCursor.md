[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerFileCursor

# Type Alias: ProxyLedgerFileCursor

> **ProxyLedgerFileCursor** = `object`

Defined in: [types/proxyClient.ts:189](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L189)

Incremental read position and accumulated entries for one request-log file.

## Properties

### offset

> **offset**: `number`

Defined in: [types/proxyClient.ts:191](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L191)

Byte offset just past the last complete line consumed.

---

### size

> **size**: `number`

Defined in: [types/proxyClient.ts:192](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L192)

---

### entries

> **entries**: `Map`\<`string`, [`ProxyLedgerEntry`](ProxyLedgerEntry.md)\>

Defined in: [types/proxyClient.ts:194](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L194)

requestId -> latest known entry, so a re-logged request cannot double count.
