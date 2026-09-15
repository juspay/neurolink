[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:1865](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1865)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:1866](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1866)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1867)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1868)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1870)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:1871](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1871)
