[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / ConfirmationResult

# Type Alias: ConfirmationResult

> **ConfirmationResult** = `object`

Defined in: [types/hitl.ts:88](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L88)

Result of a confirmation request
Contains user decision and potentially modified arguments

## Properties

### approved

> **approved**: `boolean`

Defined in: [types/hitl.ts:90](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L90)

Whether the user approved the tool execution

---

### reason?

> `optional` **reason?**: `string`

Defined in: [types/hitl.ts:93](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L93)

Optional reason for rejection (if approved is false)

---

### modifiedArguments?

> `optional` **modifiedArguments?**: `unknown`

Defined in: [types/hitl.ts:96](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L96)

User-modified arguments (if allowArgumentModification is enabled)

---

### responseTime

> **responseTime**: `number`

Defined in: [types/hitl.ts:99](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/hitl.ts#L99)

Time taken for user to respond in milliseconds
