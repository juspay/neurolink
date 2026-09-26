[**NeuroLink API Reference**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorContext

# Type Alias: ProviderErrorContext

> **ProviderErrorContext** = `object`

Everything a ProviderErrorRule's `match`/`message` functions can inspect
about a raw thrown error, pre-extracted once so every rule doesn't
re-derive the same duck-typed fields.

## Properties

### error

> **error**: `unknown`

The raw thrown value, for rules that need custom inspection beyond the extracted fields.

---

### message

> **message**: `string`

`.message` off the raw error, or "Unknown error" if absent/non-string.

---

### statusCode

> **statusCode**: `number` \| `undefined`

HTTP status code, duck-typed from `.statusCode` / `.status`.

---

### errorName

> **errorName**: `string` \| `undefined`

`.name` off the raw error (e.g. AWS SDK exception names like "ThrottlingException").

---

### errorCode

> **errorCode**: `string` \| `undefined`

`.code` off the raw error (e.g. AWS SDK / Node network error codes).

---

### provider

> **provider**: `string`

Provider key passed to classifyProviderError (e.g. "mistral", "vertex").

---

### modelName

> **modelName**: `string` \| `undefined`

Model name in effect for this call, when the caller has one available.
