[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / RetryContext

# Type Alias: RetryContext

> **RetryContext** = `object`

Defined in: [types/observability.ts:415](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L415)

Context for retry decision making

## Properties

### attempt

> **attempt**: `number`

Defined in: [types/observability.ts:417](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L417)

Current attempt number (0-indexed)

---

### error

> **error**: `Error`

Defined in: [types/observability.ts:419](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L419)

The error that triggered the retry

---

### elapsedMs

> **elapsedMs**: `number`

Defined in: [types/observability.ts:421](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L421)

Total elapsed time since first attempt

---

### operationName

> **operationName**: `string`

Defined in: [types/observability.ts:423](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L423)

Operation name for logging

---

### metadata?

> `optional` **metadata?**: `Record`\<`string`, `unknown`\>

Defined in: [types/observability.ts:425](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/observability.ts#L425)

Additional metadata
