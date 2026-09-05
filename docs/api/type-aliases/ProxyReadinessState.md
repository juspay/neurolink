[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:1671](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1671)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:1672](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1672)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1673](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1673)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1674](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1674)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1676](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1676)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:1677](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1677)
