[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:2034](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2034)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:2035](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2035)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:2036](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2036)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2037](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2037)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:2039](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2039)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:2040](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2040)
