[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyPoolHeadroom

# Type Alias: ProxyPoolHeadroom

> **ProxyPoolHeadroom** = `object`

Aggregate account-pool headroom at the moment a response was produced.

## Properties

### available

> **available**: `number`

Accounts eligible to serve a request right now (not cooling/disabled).

---

### cooling

> **cooling**: `number`

Accounts currently in a cooldown window.

---

### bestSessionLeftPct?

> `optional` **bestSessionLeftPct?**: `number`

Best session headroom across available accounts, as a percentage 0-100.
Undefined when no available account has a quota snapshot.
