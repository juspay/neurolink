[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / DelegateHandle

# Type Alias: DelegateHandle

> **DelegateHandle** = `object`

Returned the moment a worker is spawned — before it has run anything.
`queued` is true when the process-wide delegation pool was full and the
worker is waiting for a slot.

## Properties

### workerId

> **workerId**: `string`

---

### spawnedAt

> **spawnedAt**: `number`

---

### queued

> **queued**: `boolean`
