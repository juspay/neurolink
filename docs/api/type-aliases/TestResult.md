[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / TestResult

# Type Alias: TestResult

> **TestResult** = `object`

Defined in: [types/common.ts:289](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L289)

Result of a single test execution.

## Properties

### name

> **name**: `string`

Defined in: [types/common.ts:291](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L291)

Display name of the test

---

### result

> **result**: `boolean`

Defined in: [types/common.ts:293](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L293)

Whether the test passed

---

### error

> **error**: `string` \| `null`

Defined in: [types/common.ts:295](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L295)

Error message if the test failed, null otherwise

---

### category?

> `optional` **category?**: `string`

Defined in: [types/common.ts:297](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L297)

Optional grouping category

---

### duration?

> `optional` **duration?**: `number`

Defined in: [types/common.ts:299](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/common.ts#L299)

Optional execution duration in milliseconds
