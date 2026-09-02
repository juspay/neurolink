[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerFileCursor

# Type Alias: ProxyLedgerFileCursor

> **ProxyLedgerFileCursor** = `object`

Defined in: [types/proxyClient.ts:224](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L224)

Incremental read position and accumulated entries for one request-log file.

## Properties

### offset

> **offset**: `number`

Defined in: [types/proxyClient.ts:226](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L226)

Byte offset just past the last complete line consumed.

---

### size

> **size**: `number`

Defined in: [types/proxyClient.ts:227](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L227)

---

### entries

> **entries**: `Map`\<`string`, [`ProxyLedgerEntry`](ProxyLedgerEntry.md)\>

Defined in: [types/proxyClient.ts:229](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L229)

requestId -> latest known entry, so a re-logged request cannot double count.
