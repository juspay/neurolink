[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:2037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2037)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:2038](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2038)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:2039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2039)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2040)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:2042](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2042)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:2043](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2043)
