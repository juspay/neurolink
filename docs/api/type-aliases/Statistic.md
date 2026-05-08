[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / Statistic

# Type Alias: Statistic

> **Statistic** = `object`

Defined in: [types/ppt.ts:339](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L339)

Statistic/metric for statistics slides
Maps to: addText with large fontSize

## Properties

### value

> **value**: `string`

Defined in: [types/ppt.ts:341](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L341)

The big number/value

---

### label

> **label**: `string`

Defined in: [types/ppt.ts:343](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L343)

Label describing the metric

---

### trend?

> `optional` **trend?**: `"up"` \| `"down"` \| `"neutral"`

Defined in: [types/ppt.ts:345](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L345)

Optional trend indicator: up, down, neutral

---

### change?

> `optional` **change?**: `string`

Defined in: [types/ppt.ts:347](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L347)

Change text (e.g., "+15%")

---

### icon?

> `optional` **icon?**: `string`

Defined in: [types/ppt.ts:349](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/ppt.ts#L349)

Icon code (Unicode)
