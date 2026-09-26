[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntimeOptions

# Type Alias: SocketWorkerRuntimeOptions

> **SocketWorkerRuntimeOptions** = `object`

Defined in: [types/proxy.ts:3558](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3558)

## Properties

### onDrained?

> `optional` **onDrained?**: () => `void`

Defined in: [types/proxy.ts:3559](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3559)

#### Returns

`void`

---

### firstRequestGraceMs?

> `optional` **firstRequestGraceMs?**: `number`

Defined in: [types/proxy.ts:3561](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3561)

Bound for a committed socket's first HTTP request while draining.
