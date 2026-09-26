[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyReadinessState

# Type Alias: ProxyReadinessState

> **ProxyReadinessState** = `object`

Mutable readiness state tracked by the proxy process.

## Properties

### startTimeMs

> **startTimeMs**: `number`

---

### acceptingConnections

> **acceptingConnections**: `boolean`

---

### ready

> **ready**: `boolean`

---

### drainingForUpdate

> **drainingForUpdate**: `boolean`

True only while the updater is draining inference traffic.

---

### readyAtMs?

> `optional` **readyAtMs?**: `number`
