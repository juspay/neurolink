[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / SocketWorkerRuntimeOptions

# Type Alias: SocketWorkerRuntimeOptions

> **SocketWorkerRuntimeOptions** = `object`

Defined in: [types/proxy.ts:3488](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3488)

## Properties

### onDrained?

> `optional` **onDrained?**: () => `void`

Defined in: [types/proxy.ts:3489](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3489)

#### Returns

`void`

---

### firstRequestGraceMs?

> `optional` **firstRequestGraceMs?**: `number`

Defined in: [types/proxy.ts:3491](https://github.com/juspay/neurolink/blob/release/src/lib/types/proxy.ts#L3491)

Bound for a committed socket's first HTTP request while draining.
