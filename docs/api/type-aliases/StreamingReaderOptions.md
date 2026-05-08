[**NeuroLink API Reference v9.62.0**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingReaderOptions

# Type Alias: StreamingReaderOptions

> **StreamingReaderOptions** = `object`

Defined in: [types/fileReference.ts:178](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L178)

Options for the streaming reader

## Properties

### tokenBudget?

> `optional` **tokenBudget?**: `number`

Defined in: [types/fileReference.ts:180](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L180)

Maximum tokens to read (stops when budget exhausted)

---

### startLine?

> `optional` **startLine?**: `number`

Defined in: [types/fileReference.ts:182](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L182)

Starting line number (1-indexed, default 1)

---

### endLine?

> `optional` **endLine?**: `number`

Defined in: [types/fileReference.ts:184](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L184)

Ending line number (1-indexed, default EOF)

---

### encoding?

> `optional` **encoding?**: `BufferEncoding`

Defined in: [types/fileReference.ts:186](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L186)

Encoding (default 'utf-8')

---

### provider?

> `optional` **provider?**: `string`

Defined in: [types/fileReference.ts:188](https://github.com/juspay/neurolink/blob/ff50c1e5a18abd666c68e6a6290bfe2015cb65b1/src/lib/types/fileReference.ts#L188)

Provider name for token estimation multiplier
