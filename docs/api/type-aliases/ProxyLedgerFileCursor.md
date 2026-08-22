[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerFileCursor

# Type Alias: ProxyLedgerFileCursor

> **ProxyLedgerFileCursor** = `object`

Defined in: [types/proxyClient.ts:157](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L157)

Incremental read position and accumulated entries for one request-log file.

## Properties

### offset

> **offset**: `number`

Defined in: [types/proxyClient.ts:159](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L159)

Byte offset just past the last complete line consumed.

---

### size

> **size**: `number`

Defined in: [types/proxyClient.ts:160](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L160)

---

### entries

> **entries**: `Map`\<`string`, [`ProxyLedgerEntry`](ProxyLedgerEntry.md)\>

Defined in: [types/proxyClient.ts:162](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxyClient.ts#L162)

requestId -> latest known entry, so a re-logged request cannot double count.
