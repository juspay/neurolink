[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntimeOptions

# Type Alias: SocketWorkerRuntimeOptions

> **SocketWorkerRuntimeOptions** = `object`

Defined in: [types/proxy.ts:3618](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3618)

## Properties

### onDrained?

> `optional` **onDrained?**: () => `void`

Defined in: [types/proxy.ts:3619](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3619)

#### Returns

`void`

---

### firstRequestGraceMs?

> `optional` **firstRequestGraceMs?**: `number`

Defined in: [types/proxy.ts:3621](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3621)

Bound for a committed socket's first HTTP request while draining.
