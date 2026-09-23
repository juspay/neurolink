[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntimeOptions

# Type Alias: SocketWorkerRuntimeOptions

> **SocketWorkerRuntimeOptions** = `object`

Defined in: [types/proxy.ts:3468](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3468)

## Properties

### onDrained?

> `optional` **onDrained?**: () => `void`

Defined in: [types/proxy.ts:3469](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3469)

#### Returns

`void`

---

### firstRequestGraceMs?

> `optional` **firstRequestGraceMs?**: `number`

Defined in: [types/proxy.ts:3471](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3471)

Bound for a committed socket's first HTTP request while draining.
