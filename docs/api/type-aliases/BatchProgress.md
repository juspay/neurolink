[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchProgress

# Type Alias: BatchProgress

> **BatchProgress** = `object`

Defined in: [types/evaluation.ts:389](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L389)

Superset batch progress. `pending` is canonical; `remaining` in the
pipeline's batchStrategy was renamed during consolidation (same value).

## Properties

### total

> **total**: `number`

Defined in: [types/evaluation.ts:390](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L390)

---

### completed

> **completed**: `number`

Defined in: [types/evaluation.ts:391](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L391)

---

### failed

> **failed**: `number`

Defined in: [types/evaluation.ts:392](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L392)

---

### pending

> **pending**: `number`

Defined in: [types/evaluation.ts:393](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L393)

---

### percentComplete

> **percentComplete**: `number`

Defined in: [types/evaluation.ts:394](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L394)

---

### succeeded?

> `optional` **succeeded?**: `number`

Defined in: [types/evaluation.ts:395](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L395)

---

### estimatedTimeRemaining?

> `optional` **estimatedTimeRemaining?**: `number`

Defined in: [types/evaluation.ts:396](https://github.com/juspay/neurolink/blob/release/src/lib/types/evaluation.ts#L396)
