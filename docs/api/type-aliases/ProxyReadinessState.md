[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:1665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1665)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:1666](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1666)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1667](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1667)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1668](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1668)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1670](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1670)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1671)
