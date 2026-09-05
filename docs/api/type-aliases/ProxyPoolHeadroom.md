[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPoolHeadroom

# Type Alias: ProxyPoolHeadroom

> **ProxyPoolHeadroom** = `object`

Defined in: [types/proxy.ts:1506](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1506)

Aggregate account-pool headroom at the moment a response was produced.

## Properties

### available

> **available**: `number`

Defined in: [types/proxy.ts:1508](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1508)

Accounts eligible to serve a request right now (not cooling/disabled).

---

### cooling

> **cooling**: `number`

Defined in: [types/proxy.ts:1510](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1510)

Accounts currently in a cooldown window.

---

### bestSessionLeftPct?

> `optional` **bestSessionLeftPct?**: `number`

Defined in: [types/proxy.ts:1513](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1513)

Best session headroom across available accounts, as a percentage 0-100.
Undefined when no available account has a quota snapshot.
