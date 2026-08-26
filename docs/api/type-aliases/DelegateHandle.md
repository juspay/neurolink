[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateHandle

# Type Alias: DelegateHandle

> **DelegateHandle** = `object`

Defined in: [types/delegation.ts:59](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L59)

Returned the moment a worker is spawned — before it has run anything.
`queued` is true when the process-wide delegation pool was full and the
worker is waiting for a slot.

## Properties

### workerId

> **workerId**: `string`

Defined in: [types/delegation.ts:60](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L60)

---

### spawnedAt

> **spawnedAt**: `number`

Defined in: [types/delegation.ts:61](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L61)

---

### queued

> **queued**: `boolean`

Defined in: [types/delegation.ts:62](https://github.com/juspay/neurolink/blob/release/src/lib/types/delegation.ts#L62)
