[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:1659](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1659)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:1660](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1660)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:1661](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1661)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:1662](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1662)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:1664](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1664)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:1665](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L1665)
