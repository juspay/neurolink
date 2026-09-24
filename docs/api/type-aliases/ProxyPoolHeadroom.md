[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPoolHeadroom

# Type Alias: ProxyPoolHeadroom

> **ProxyPoolHeadroom** = `object`

Defined in: [types/proxy.ts:1951](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1951)

Aggregate account-pool headroom at the moment a response was produced.

## Properties

### available

> **available**: `number`

Defined in: [types/proxy.ts:1953](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1953)

Accounts eligible to serve a request right now (not cooling/disabled).

---

### cooling

> **cooling**: `number`

Defined in: [types/proxy.ts:1955](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1955)

Accounts currently in a cooldown window.

---

### bestSessionLeftPct?

> `optional` **bestSessionLeftPct?**: `number`

Defined in: [types/proxy.ts:1958](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1958)

Best session headroom across available accounts, as a percentage 0-100.
Undefined when no available account has a quota snapshot.
