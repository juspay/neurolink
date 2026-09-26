[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / StreamingReaderOptions

# Type Alias: StreamingReaderOptions

> **StreamingReaderOptions** = `object`

Options for the streaming reader

## Properties

### tokenBudget?

> `optional` **tokenBudget?**: `number`

Maximum tokens to read (stops when budget exhausted)

---

### startLine?

> `optional` **startLine?**: `number`

Starting line number (1-indexed, default 1)

---

### endLine?

> `optional` **endLine?**: `number`

Ending line number (1-indexed, default EOF)

---

### encoding?

> `optional` **encoding?**: `BufferEncoding`

Encoding (default 'utf-8')

---

### provider?

> `optional` **provider?**: `string`

Provider name for token estimation multiplier
