[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ValidationIssue

# Type Alias: ValidationIssue

> **ValidationIssue** = `object`

Defined in: [types/ioProcessor.ts:85](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L85)

## Properties

### category

> **category**: `string`

Defined in: [types/ioProcessor.ts:87](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L87)

Short machine-readable category (e.g., "length", "json_schema", "phrase")

---

### severity

> **severity**: `"error"` \| `"warning"` \| `"info"`

Defined in: [types/ioProcessor.ts:88](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L88)

---

### message

> **message**: `string`

Defined in: [types/ioProcessor.ts:89](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L89)

---

### field?

> `optional` **field?**: `string`

Defined in: [types/ioProcessor.ts:91](https://github.com/juspay/neurolink/blob/49032fc5b1df7b90bfda013d9be71423e358001e/src/lib/types/ioProcessor.ts#L91)

Optional field path (useful for JSON schema errors)
