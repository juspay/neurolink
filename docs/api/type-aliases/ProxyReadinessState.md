[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Defined in: [types/proxy.ts:2014](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2014)

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

Defined in: [types/proxy.ts:2015](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2015)

---

### acceptingConnections

> **acceptingConnections**: `boolean`

Defined in: [types/proxy.ts:2016](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2016)

---

### ready

> **ready**: `boolean`

Defined in: [types/proxy.ts:2017](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2017)

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

Defined in: [types/proxy.ts:2019](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2019)

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`

Defined in: [types/proxy.ts:2020](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L2020)
