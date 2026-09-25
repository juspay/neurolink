[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:2102](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2102)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:2103](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2103)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:2104](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2104)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2105](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2105)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:2107](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2107)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:2108](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2108)
