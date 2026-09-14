[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:1858](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1858)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:1859](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1859)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1860](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1860)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1861](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1861)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1863](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1863)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:1864](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1864)
