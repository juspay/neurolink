[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPoolHeadroom

# Type Alias: ProxyPoolHeadroom

> **ProxyPoolHeadroom** = `object`

Defined in: [types/proxy.ts:1495](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1495)

Aggregate account-pool headroom at the moment a response was produced.

## Properties

### available

> **available**: `number`

Defined in: [types/proxy.ts:1497](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1497)

Accounts eligible to serve a request right now (not cooling/disabled).

---

### cooling

> **cooling**: `number`

Defined in: [types/proxy.ts:1499](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1499)

Accounts currently in a cooldown window.

---

### bestSessionLeftPct?

> `optional` **bestSessionLeftPct?**: `number`

Defined in: [types/proxy.ts:1502](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1502)

Best session headroom across available accounts, as a percentage 0-100.
Undefined when no available account has a quota snapshot.
