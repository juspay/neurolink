[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:1867](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1867)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:1868](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1868)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1869](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1869)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1870](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1870)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1872](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1872)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:1873](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1873)
