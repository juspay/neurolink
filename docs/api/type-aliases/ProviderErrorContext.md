[**NeuroLink API Reference v11.2.3**](../README.md)

---

[NeuroLink API Reference](../README.md) / ProviderErrorContext

# Type Alias: ProviderErrorContext

> **ProviderErrorContext** = `object`

Defined in: [types/errors.ts:80](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L80)

Everything a ProviderErrorRule's `match`/`message` functions can inspect
about a raw thrown error, pre-extracted once so every rule doesn't
re-derive the same duck-typed fields.

## Properties

### error

> **error**: `unknown`

Defined in: [types/errors.ts:82](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L82)

The raw thrown value, for rules that need custom inspection beyond the extracted fields.

---

### message

> **message**: `string`

Defined in: [types/errors.ts:84](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L84)

`.message` off the raw error, or "Unknown error" if absent/non-string.

---

### statusCode

> **statusCode**: `number` \| `undefined`

Defined in: [types/errors.ts:86](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L86)

HTTP status code, duck-typed from `.statusCode` / `.status`.

---

### errorName

> **errorName**: `string` \| `undefined`

Defined in: [types/errors.ts:88](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L88)

`.name` off the raw error (e.g. AWS SDK exception names like "ThrottlingException").

---

### errorCode

> **errorCode**: `string` \| `undefined`

Defined in: [types/errors.ts:90](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L90)

`.code` off the raw error (e.g. AWS SDK / Node network error codes).

---

### provider

> **provider**: `string`

Defined in: [types/errors.ts:92](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L92)

Provider key passed to classifyProviderError (e.g. "mistral", "vertex").

---

### modelName

> **modelName**: `string` \| `undefined`

Defined in: [types/errors.ts:94](https://github.com/mansiverma897993/neurolink/blob/2b1aca22c252cf536a76d9d88df95d715b888328/src/lib/types/errors.ts#L94)

Model name in effect for this call, when the caller has one available.
