[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / BatchProgress

# Type Alias: BatchProgress

> **BatchProgress** = `object`

Defined in: [types/evaluation.ts:394](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L394)

Superset batch progress. `pending` is canonical; `remaining` in the
pipeline's batchStrategy was renamed during consolidation (same value).

## Properties

### total

> **total**: `number`

Defined in: [types/evaluation.ts:395](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L395)

---

### completed

> **completed**: `number`

Defined in: [types/evaluation.ts:396](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L396)

---

### failed

> **failed**: `number`

Defined in: [types/evaluation.ts:397](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L397)

---

### pending

> **pending**: `number`

Defined in: [types/evaluation.ts:398](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L398)

---

### percentComplete

> **percentComplete**: `number`

Defined in: [types/evaluation.ts:399](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L399)

---

### succeeded?

> `optional` **succeeded?**: `number`

Defined in: [types/evaluation.ts:400](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L400)

---

### estimatedTimeRemaining?

> `optional` **estimatedTimeRemaining?**: `number`

Defined in: [types/evaluation.ts:401](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/evaluation.ts#L401)
