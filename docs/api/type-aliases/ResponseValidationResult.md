[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ResponseValidationResult

# Type Alias: ResponseValidationResult

> **ResponseValidationResult** = `object`

Defined in: [types/ioProcessor.ts:94](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L94)

## Properties

### text

> **text**: `string`

Defined in: [types/ioProcessor.ts:96](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L96)

Possibly-mutated response text (truncation may shorten it)

---

### action

> **action**: `"continue"` \| `"abort"` \| `"retry"`

Defined in: [types/ioProcessor.ts:98](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L98)

What the caller should do next

---

### issues

> **issues**: [`ValidationIssue`](ValidationIssue.md)[]

Defined in: [types/ioProcessor.ts:100](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L100)

All issues found during validation

---

### feedback?

> `optional` **feedback?**: `string`

Defined in: [types/ioProcessor.ts:102](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L102)

Human-readable summary suitable for inclusion in a retry prompt

---

### retryCount?

> `optional` **retryCount?**: `number`

Defined in: [types/ioProcessor.ts:104](https://github.com/juspay/neurolink/blob/release/src/lib/types/ioProcessor.ts#L104)

The retryCount that was passed in (echoed back for convenience)
