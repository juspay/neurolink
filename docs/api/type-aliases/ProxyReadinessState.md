[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:1650](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1650)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:1651](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1651)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1652](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1652)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1653](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1653)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1655](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1655)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:1656](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1656)
