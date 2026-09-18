[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPoolHeadroom

# Type Alias: ProxyPoolHeadroom

> **ProxyPoolHeadroom** = `object`

Defined in: [types/proxy.ts:1717](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1717)

Aggregate account-pool headroom at the moment a response was produced.

## Properties

### available

> **available**: `number`

Defined in: [types/proxy.ts:1719](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1719)

Accounts eligible to serve a request right now (not cooling/disabled).

---

### cooling

> **cooling**: `number`

Defined in: [types/proxy.ts:1721](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1721)

Accounts currently in a cooldown window.

---

### bestSessionLeftPct?

> `optional` **bestSessionLeftPct?**: `number`

Defined in: [types/proxy.ts:1724](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1724)

Best session headroom across available accounts, as a percentage 0-100.
Undefined when no available account has a quota snapshot.
