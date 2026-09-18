[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:1882](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1882)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:1883](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1883)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1884](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1884)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1885](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1885)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1887](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1887)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:1888](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1888)
