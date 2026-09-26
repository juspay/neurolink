[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyLedgerFileCursor

# Type Alias: ProxyLedgerFileCursor

> **ProxyLedgerFileCursor** = `object`

Incremental read position and accumulated entries for one request-log file.

## Properties

### offset

> **offset**: `number`

Byte offset just past the last complete line consumed.

---

### size

> **size**: `number`

---

### entries

> **entries**: `Map`\<`string`, [`ProxyLedgerEntry`](ProxyLedgerEntry.md)\>

requestId -> latest known entry, so a re-logged request cannot double count.
