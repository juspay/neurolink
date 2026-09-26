[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProxyTerminalErrorSummary

# Type Alias: ProxyTerminalErrorSummary

> **ProxyTerminalErrorSummary** = `object`

Compact, redacted terminal failure retained independently of body logs.

## Properties

### id

> **id**: `string`

---

### at

> **at**: `number`

---

### status

> **status**: `number`

---

### category

> **category**: [`ProxyTerminalErrorCategory`](ProxyTerminalErrorCategory.md)

---

### requestId?

> `optional` **requestId?**: `string`

---

### account?

> `optional` **account?**: `string`

---

### accountKey?

> `optional` **accountKey?**: `string`

Provider-qualified account identity when the failure was attributable.

---

### accountType?

> `optional` **accountType?**: `string`

---

### errorType?

> `optional` **errorType?**: `string`

---

### errorCode?

> `optional` **errorCode?**: `string`

---

### terminalOutcome?

> `optional` **terminalOutcome?**: `string`

---

### message?

> `optional` **message?**: `string`
